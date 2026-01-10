import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const id = params.id;
        const video = await prisma.video.findUnique({
            where: { id },
            include: {
                metrics: {
                    orderBy: { collectedAt: "desc" },
                    take: 1
                }
            }
        });

        if (!video) {
            return NextResponse.json({ error: "Video not found" }, { status: 404 });
        }

        const { metrics, ...videoData } = video;
        const enrichedVideo = {
            ...videoData,
            currentMetrics: metrics[0] || null
        };

        return NextResponse.json({ video: enrichedVideo });

    } catch (error) {
        console.error("Error fetching video:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const id = params.id;

        // Soft delete by setting deletedAt
        const video = await prisma.video.update({
            where: { id },
            data: { deletedAt: new Date() }
        });

        return NextResponse.json({ success: true, message: "Video deleted" });

    } catch (error) {
        console.error("Error deleting video:", error);
        return NextResponse.json({ error: "Failed to delete video" }, { status: 500 });
    }
}
