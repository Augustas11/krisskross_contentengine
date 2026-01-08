import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { analyzeVideo } from "@/lib/services/videoAnalyzer";
import prisma from "@/lib/prisma";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: videoId } = await params;
        const { searchParams } = new URL(req.url);
        const forceReanalysis = searchParams.get("force") === "true";

        // Verify video exists
        const video = await prisma.video.findUnique({
            where: { id: videoId },
            include: { user: true },
        });

        if (!video) {
            return NextResponse.json({ error: "Video not found" }, { status: 404 });
        }

        // NOTE: Ownership check relaxed for MVP - any authenticated user can analyze
        // TODO: Re-enable strict ownership in production
        // const userOwnsVideo = video.user.email === session.user.email;
        // if (!userOwnsVideo) {
        //     return NextResponse.json({ error: "Forbidden - You don't own this video" }, { status: 403 });
        // }

        // Trigger analysis
        const result = await analyzeVideo(videoId, forceReanalysis);

        if (result.success) {
            return NextResponse.json({
                success: true,
                analysisId: result.analysisId,
                needsReview: result.needsReview,
            });
        } else {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("Analyze video error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// GET endpoint to check analysis status
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: videoId } = await params;

        const video = await prisma.video.findUnique({
            where: { id: videoId },
            select: {
                id: true,
                analysisStatus: true,
                analysis: true,
            },
        });

        if (!video) {
            return NextResponse.json({ error: "Video not found" }, { status: 404 });
        }

        return NextResponse.json({
            videoId: video.id,
            status: video.analysisStatus,
            hasAnalysis: video.analysis !== null,
            analysis: video.analysis,
        });
    } catch (error) {
        console.error("Get analysis error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
