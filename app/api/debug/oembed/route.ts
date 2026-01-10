import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const tiktokUrl = searchParams.get("url") || "https://www.tiktok.com/@tiktok/video/7451820653923820847";

    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(tiktokUrl)}`;

    try {
        const response = await fetch(oembedUrl, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (compatible; Vercel/1.0)"
            },
        });

        const data = await response.json();

        return NextResponse.json({
            status: response.status,
            statusText: response.statusText,
            oembedUrl,
            data,
            serverInfo: {
                region: process.env.VERCEL_REGION || "unknown",
                environment: process.env.VERCEL_ENV || "development"
            }
        });
    } catch (error) {
        return NextResponse.json({
            error: String(error),
            oembedUrl
        }, { status: 500 });
    }
}
