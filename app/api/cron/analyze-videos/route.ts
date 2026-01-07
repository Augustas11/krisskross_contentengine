import { NextRequest, NextResponse } from "next/server";
import { batchAnalyzeVideos } from "@/lib/services/videoAnalyzer";

export const maxDuration = 300; // 5 minutes for Vercel Pro

export async function GET(request: NextRequest) {
    // Optional: Add CRON_SECRET check for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        // If CRON_SECRET is set, require auth
        // return new Response("Unauthorized", { status: 401 });
        console.warn("Cron auth skipped - CRON_SECRET check disabled for dev");
    }

    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "10");
        const delay = parseInt(searchParams.get("delay") || "2000");

        console.log(`Starting batch analysis: limit=${limit}, delay=${delay}ms`);

        const result = await batchAnalyzeVideos(limit, delay);

        console.log(
            `Batch analysis complete: processed=${result.processed}, successful=${result.successful}, failed=${result.failed}`
        );

        return NextResponse.json({
            success: true,
            ...result,
        });
    } catch (error) {
        console.error("Batch analysis cron error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

// POST endpoint for triggering retroactive analysis of all pending videos
export async function POST(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.warn("Cron auth skipped - CRON_SECRET check disabled for dev");
    }

    try {
        const body = await request.json().catch(() => ({}));
        const limit = body.limit || 50;
        const delay = body.delay || 3000;

        console.log(
            `Starting retroactive analysis: limit=${limit}, delay=${delay}ms`
        );

        const result = await batchAnalyzeVideos(limit, delay);

        return NextResponse.json({
            success: true,
            message: "Retroactive analysis triggered",
            ...result,
        });
    } catch (error) {
        console.error("Retroactive analysis error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
