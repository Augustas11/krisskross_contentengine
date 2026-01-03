
import prisma from "@/lib/prisma";

export async function generateInsights() {
    console.log("Starting Insight Generation...");

    // 1. Fetch all videos with their latest metrics
    // We only care about videos that actually have metrics
    const videos = await prisma.video.findMany({
        where: {
            metrics: { some: {} }
        },
        include: {
            metrics: {
                orderBy: { collectedAt: "desc" },
                take: 1
            }
        }
    });

    if (videos.length === 0) {
        console.log("No videos with metrics found.");
        return { count: 0 };
    }

    // 2. Calculate Global Average Engagement
    const totalEngagement = videos.reduce((acc, v) => {
        const rate = v.metrics[0]?.engagementRate || 0;
        return acc + Number(rate);
    }, 0);
    const globalAvg = totalEngagement / videos.length;

    console.log(`Global Average Engagement: ${globalAvg.toFixed(2)}%`);

    const insightsCreated = [];

    // 3. Analyze by Content Type
    // Group videos by Content Type
    const videosByType: Record<string, typeof videos> = {};

    videos.forEach(v => {
        const type = v.contentType || "Uncategorized";
        if (!videosByType[type]) videosByType[type] = [];
        videosByType[type].push(v);
    });

    // Evaluate each type
    for (const [type, typeVideos] of Object.entries(videosByType)) {
        if (type === "Uncategorized") continue;
        if (typeVideos.length < 2) continue; // Need minimal sample size

        const typeTotalEng = typeVideos.reduce((acc, v) => acc + Number(v.metrics[0]?.engagementRate || 0), 0);
        const typeAvg = typeTotalEng / typeVideos.length;

        // Threshold: Type performs 15% better than global average
        if (typeAvg > globalAvg * 1.15) {
            const lift = ((typeAvg - globalAvg) / globalAvg) * 100;
            const text = `${type} videos are outperforming the average by ${lift.toFixed(0)}%.`;

            // Upsert Insight
            // finding existing insight for this category to update, or create new
            // For MVP simpler: just create or update based on text uniqueness or similar
            // We'll search by category 'content_type' and the specific type value in text or similar?
            // Actually, let's use the 'category' field in DB.

            // Simple approach: Delete old insights for this category to refresh them? 
            // Or just append. Let's append but check for duplicates.

            const insight = await prisma.insight.create({
                data: {
                    insightText: text,
                    category: "content_type",
                    confidenceScore: 0.85, // Simple heuristic confidence
                    sampleSize: typeVideos.length,
                    supportingVideoIds: typeVideos.map(v => v.id),
                    status: "active"
                }
            });
            insightsCreated.push(insight);
        }
    }

    // 4. Analyze by Duration (Short < 15s, Medium 15-60s, Long > 60s)
    // (Skipping for purely MVP speed, focus on Content Type first)

    // 5. Best Practices Generation (Simplistic)
    // If a video has > 2x average engagement, it's a "Best Practice" candidate
    const topPerformers = videos.filter(v => {
        const rate = Number(v.metrics[0]?.engagementRate || 0);
        return rate > globalAvg * 1.5; // 1.5x threshold
    });

    for (const video of topPerformers) {
        // Create a best practice entry if not exists
        const existingInfo = await prisma.bestPractice.findFirst({
            where: { exampleVideoIds: { has: video.id } }
        });

        if (!existingInfo) {
            await prisma.bestPractice.create({
                data: {
                    type: "high_performer",
                    title: `High Performing: ${video.hook || video.contentType || "Video"}`,
                    content: "This video has significantly higher engagement than average. Analyze its hook and structure.",
                    exampleVideoIds: [video.id],
                    performanceAvg: video.metrics[0]?.engagementRate,
                    useCount: 0
                }
            });
        }
    }

    return {
        globalAvg,
        insightsGenerated: insightsCreated.length,
        bestPracticesFound: topPerformers.length
    };
}
