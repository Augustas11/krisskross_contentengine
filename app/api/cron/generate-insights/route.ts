
import { NextResponse } from "next/server";
import { generateInsights } from "@/lib/services/insightGenerator";

export const maxDuration = 300;

export async function GET(request: Request) {
    try {
        const result = await generateInsights();
        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error("Insight Generation Error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
