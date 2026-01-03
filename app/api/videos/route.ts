import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const search = searchParams.get("search") || "";
        const contentType = searchParams.get("contentType");
        const campaignTag = searchParams.get("campaignTag");
        const sort = searchParams.get("sort") || "newest"; // newest, engagement, performance

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

        if (sort === "performance") {
            // Sort by engagement rate (needs relation, tricky in simple sort, usually handled by fetching and sorting or optimized schema)
            // For MVP, if we want to sort by latest metrics, we can try relations sort if supported or fallback to just uploadDate.
            // Prisma supports relation ordering in some cases.
            // Metrics are 1:N but we usually care about the latest metric.
            // To keep it simple/performant: we might rely on client-side sort for small datasets or use a 'lastPerformance' field on Video if updated.
            // Plan: Let's stick to uploadDate default, and maybe basic metric sort if feasible. 
            // User can sort by engagement in the table (client side for 10-50 videos is fine, server-side for many).
            // Let's implement newest/oldest for now.
        }

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
                    }
                }
            }),
            prisma.video.count({ where }),
        ]);

        // Flatten metrics for easier consumption
        const enrichedVideos = videos.map(v => ({
            ...v,
            currentMetrics: v.metrics[0] || null
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
