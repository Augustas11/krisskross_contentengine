import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { videoMetadataSchema } from "@/lib/schemas/video";
import { z } from "zod";
import { fetchTikTokOEmbed } from "@/lib/tiktok-oembed";
import { fetchTikTokVideoById, extractTikTokVideoId } from "@/lib/tiktok";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const search = searchParams.get("search") || "";
        const contentType = searchParams.get("contentType");
        const campaignTag = searchParams.get("campaignTag");
        const sort = searchParams.get("sort") || "newest";

        const skip = (page - 1) * limit;

        const where: Prisma.VideoWhereInput = {
            deletedAt: null,
            AND: [
                search ? {
                    OR: [
                        { hook: { contains: search, mode: "insensitive" } },
                        { caption: { contains: search, mode: "insensitive" } },
                        { description: { contains: search, mode: "insensitive" } },
                        { filename: { contains: search, mode: "insensitive" } },
                    ],
                } : {},
                contentType ? { contentType: contentType } : {},
                campaignTag ? { campaignTag: campaignTag } : {},
            ],
        };

        let orderBy: Prisma.VideoOrderByWithRelationInput = { uploadDate: "desc" };

        const [videos, total] = await prisma.$transaction([
            prisma.video.findMany({
                where,
                take: limit,
                skip,
                orderBy,
                include: {
                    metrics: {
                        orderBy: { collectedAt: "desc" },
                        take: 1
                    },
                    analysis: true
                }
            }),
            prisma.video.count({ where }),
        ]);

        const enrichedVideos = videos.map(v => ({
            ...v,
            currentMetrics: v.metrics[0] || null,
            // Include analysis status for UI display
        }));

        return NextResponse.json({
            data: enrichedVideos,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching videos:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // For MVP, if auth is not strictly required or if using a placeholder without real DB user:
        // Checking if we have a user e-mail.
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        // Validate metadata
        const parsedData = videoMetadataSchema.parse(body);

        // Ensure user exists (in case of race condition or credential login without DB sync)
        // For MVP speed, we assume user from session exists OR we upsert?
        // Let's Find the user first.
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) {
            // Edge case: User logged in via credentials but not in DB? 
            // In a real app we'd handle this.
            // For MVP, return error.
            return NextResponse.json({ error: "User not found in database" }, { status: 404 });
        }

        // Fetch thumbnail from TikTok
        // Strategy: Try OAuth API first (if user has TikTok connected), then fallback to oEmbed
        let thumbnailUrl: string | undefined;
        let tiktokVideoId: string | undefined;

        if (parsedData.tiktokUrl) {
            // Extract video ID from URL
            tiktokVideoId = extractTikTokVideoId(parsedData.tiktokUrl) ?? undefined;

            // First, try OAuth API if user has TikTok connected
            const tiktokAccount = await prisma.account.findFirst({
                where: {
                    userId: user.id,
                    provider: "tiktok"
                }
            });

            if (tiktokAccount?.access_token && tiktokVideoId) {
                console.log("[Video Upload] Trying TikTok OAuth API for thumbnail...");
                const videoData = await fetchTikTokVideoById(tiktokAccount.access_token, tiktokVideoId);
                if (videoData?.cover_image_url) {
                    thumbnailUrl = videoData.cover_image_url;
                    console.log("[Video Upload] Got thumbnail from OAuth API");
                }
            }

            // Fallback to oEmbed if OAuth didn't work
            if (!thumbnailUrl) {
                console.log("[Video Upload] Trying TikTok oEmbed API for thumbnail...");
                const oembed = await fetchTikTokOEmbed(parsedData.tiktokUrl);
                thumbnailUrl = oembed.thumbnailUrl ?? undefined;
                if (thumbnailUrl) {
                    console.log("[Video Upload] Got thumbnail from oEmbed API");
                }
            }
        }

        const video = await prisma.video.create({
            data: {
                // Metadata
                hook: parsedData.hook,
                caption: parsedData.caption,
                script: parsedData.script,
                description: parsedData.description,
                contentType: parsedData.contentType,
                targetAudience: parsedData.targetAudience || [],
                cta: parsedData.cta,
                campaignTag: parsedData.campaignTag,

                // TikTok Link
                tiktokUrl: parsedData.tiktokUrl,
                tiktokVideoId: tiktokVideoId,

                // File info
                filename: parsedData.filename || `tiktok_import_${Date.now()}`,
                fileUrl: parsedData.fileUrl || parsedData.tiktokUrl || "", // Fallback to empty string or handle error if required
                thumbnailUrl: thumbnailUrl,
                embedCode: parsedData.embedCode,

                // Relations
                user: { connect: { id: user.id } }
            }
        });

        return NextResponse.json({ success: true, video });

    } catch (error) {
        console.error("Creation error:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Validation failed", details: (error as any).errors }, { status: 400 });
        }
        // Handle Prisma unique constraint violation
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                const target = (error.meta?.target as string[])?.join(", ") || "field";
                return NextResponse.json({
                    error: `This TikTok URL has already been uploaded. Please use a different video.`
                }, { status: 409 });
            }
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
