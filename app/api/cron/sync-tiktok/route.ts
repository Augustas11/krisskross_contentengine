
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fetchTikTokVideos, TikTokVideoData } from "@/lib/tiktok";

export const maxDuration = 300; // 5 minutes for Pro plan, adjust as needed

export async function GET(request: Request) {
    // Optional: Add CRON_SECRET check
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //     return new Response('Unauthorized', { status: 401 });
    // }

    try {
        // 1. Find all accounts with TikTok provider
        const accounts = await prisma.account.findMany({
            where: { provider: "tiktok" },
            include: { user: true }
        });

        const results = [];

        for (const account of accounts) {
            if (!account.access_token) {
                results.push({ user: account.userId, status: "skipped", reason: "no_token" });
                continue;
            }

            try {
                // 2. Fetch videos from TikTok
                const { videos } = await fetchTikTokVideos(account.access_token);
                let syncedCount = 0;

                for (const videoData of videos) {
                    // 3. Upsert Video
                    // logic: find by tiktokVideoId. If not found, create.

                    const existingVideo = await prisma.video.findUnique({
                        where: { tiktokVideoId: videoData.id }
                    });

                    let videoId = existingVideo?.id;

                    if (!existingVideo) {
                        // Create new video entry from TikTok data
                        const newVideo = await prisma.video.create({
                            data: {
                                userId: account.userId,
                                tiktokVideoId: videoData.id,
                                tiktokUrl: `https://www.tiktok.com/@${account.user.name}/video/${videoData.id}`, // Approximate URL
                                filename: videoData.title || `tiktok_${videoData.id}`,
                                fileUrl: videoData.embed_html, // Proxy for now
                                thumbnailUrl: videoData.cover_image_url,
                                description: videoData.video_description,
                                duration: videoData.duration,
                                contentType: "TikTok Import",
                                hook: videoData.title.slice(0, 50), // Fallback
                                caption: videoData.video_description,
                                script: "",
                                uploadDate: new Date(videoData.create_time * 1000),
                            }
                        });
                        videoId = newVideo.id;
                    }

                    if (videoId) {
                        // 4. Upsert Metrics
                        await prisma.tikTokMetric.create({
                            data: {
                                videoId: videoId,
                                views: videoData.view_count,
                                likes: videoData.like_count,
                                comments: videoData.comment_count,
                                shares: videoData.share_count,
                                engagementRate: videoData.view_count > 0
                                    ? ((videoData.like_count + videoData.comment_count + videoData.share_count) / videoData.view_count) * 100
                                    : 0,
                                collectedAt: new Date()
                            }
                        });
                        syncedCount++;
                    }
                }
                results.push({ user: account.userId, status: "success", count: syncedCount });

            } catch (error) {
                console.error(`Error syncing user ${account.userId}:`, error);
                results.push({ user: account.userId, status: "error", error: String(error) });
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error) {
        console.error("Sync Cron Error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
