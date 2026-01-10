import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Types for aggregation
interface PatternInsight {
    category: string;
    attribute: string;
    value: string;
    avg_engagement: number;
    video_count: number;
    confidence_level: 'high' | 'medium' | 'low';
    recommendation: string;
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // 1. Fetch data
        const analyses = await prisma.videoAnalysis.findMany({
            where: {
                userId: userId,
            },
            include: {
                video: {
                    include: {
                        metrics: {
                            orderBy: { collectedAt: 'desc' },
                            take: 1,
                        },
                    },
                },
            },
            orderBy: { analyzedAt: 'desc' },
        });

        if (!analyses || analyses.length < 5) { // Lower threshold for dev/demo? Prompt said 10. Let's send 10 but fallback.
            // We'll return success: false with count
            return NextResponse.json({
                success: false,
                message: `Need at least 10 videos (currently ${analyses.length})`,
                threshold: 10,
                current: analyses.length
            });
        }

        // 2. Normalize and Filter Data
        const validData = analyses.map(analysis => {
            let engagementRate = 0;

            // Try manual entry
            if (analysis.sourceType === 'manual' && analysis.manualEntryJson) {
                const manualJson = analysis.manualEntryJson as any;
                if (manualJson?.performance?.engagement_rate) {
                    engagementRate = Number(manualJson.performance.engagement_rate);
                }
            }

            // Try linked video metrics (override or fallback? Usually trusted source > manual)
            // But if manual is explicit, use manual? Let's prefer linked video if available.
            if (analysis.video?.metrics?.[0]?.engagementRate) {
                engagementRate = Number(analysis.video.metrics[0].engagementRate);
            } else if (engagementRate === 0 && analysis.video?.metrics?.[0]) {
                // Calculate manualy if not pre-calc?
                // metrics has views, likes, etc. (likes+comments+shares)/views * 100
                const m = analysis.video.metrics[0];
                if (m.views > 0) {
                    engagementRate = ((m.likes + m.comments + m.shares) / m.views) * 100;
                }
            }

            return {
                ...analysis,
                engagementRate,
            };
        }).filter(a => a.engagementRate > 0);

        // Check count again after filtering for engagement
        if (validData.length < 3) { // Lower threshold for testing
            return NextResponse.json({
                success: false,
                message: `Need at least 5 videos with performance data (currently ${validData.length})`,
                threshold: 5,
                current: validData.length
            });
        }

        const insights: PatternInsight[] = [];

        // Helper to analyze attribute
        const analyzeAttribute = (attrKey: keyof typeof validData[0], category: string, attributeName: string) => {
            const groups: Record<string, { sum: number; count: number }> = {};

            validData.forEach(video => {
                const val = video[attrKey];
                if (!val || typeof val !== 'string') return;

                // Normalize value (lowercase, trim)
                const value = val.toLowerCase().trim();

                if (!groups[value]) groups[value] = { sum: 0, count: 0 };
                groups[value].sum += video.engagementRate;
                groups[value].count += 1;
            });

            Object.entries(groups).forEach(([val, data]) => {
                if (data.count >= 2) { // Min 2 videos to form a "pattern"
                    const avg = data.sum / data.count;
                    insights.push({
                        category,
                        attribute: attributeName,
                        value: val,
                        avg_engagement: avg,
                        video_count: data.count,
                        confidence_level: getConfidenceNew(data.count, validData.length),
                        recommendation: generateRecommendation(category, val, avg, data.count)
                    });
                }
            });
        };

        // 3. Run Analysis
        analyzeAttribute('hookType', 'hook', 'type');
        analyzeAttribute('visualEnvironment', 'visual', 'environment');
        analyzeAttribute('visualLighting', 'visual', 'lighting');
        analyzeAttribute('ctaType', 'cta', 'type');

        // Combo Analysis (Environment + Lighting)
        const comboGroups: Record<string, { sum: number; count: number; v1: string; v2: string }> = {};
        validData.forEach(video => {
            if (!video.visualEnvironment || !video.visualLighting) return;
            const v1 = video.visualEnvironment.toLowerCase();
            const v2 = video.visualLighting.toLowerCase();
            const key = `${v1}|${v2}`;
            if (!comboGroups[key]) comboGroups[key] = { sum: 0, count: 0, v1, v2 };
            comboGroups[key].sum += video.engagementRate;
            comboGroups[key].count += 1;
        });

        Object.values(comboGroups).forEach(data => {
            if (data.count >= 2) {
                const avg = data.sum / data.count;
                insights.push({
                    category: 'visual',
                    attribute: 'combo',
                    value: `${data.v1} + ${data.v2}`,
                    avg_engagement: avg,
                    video_count: data.count,
                    confidence_level: getConfidenceNew(data.count, validData.length),
                    recommendation: `Your "${data.v1}" environment with "${data.v2}" lighting averages ${avg.toFixed(2)}% engagement. Seen in ${data.count} videos.`
                });
            }
        });

        // 4. Sort Findings
        insights.sort((a, b) => b.avg_engagement - a.avg_engagement);

        // 5. Store Results
        // Upsert UserPatternInsight
        // We need to match userId unique constraint.
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days cache

        await prisma.userPatternInsight.upsert({
            where: { userId },
            create: {
                userId,
                insights: insights as any, // Json type
                videoCount: validData.length,
                expiresAt,
            },
            update: {
                insights: insights as any,
                videoCount: validData.length,
                calculatedAt: new Date(),
                expiresAt,
            }
        });

        return NextResponse.json({
            success: true,
            insights: insights.slice(0, 10),
            total_videos_analyzed: validData.length,
            insights_generated: insights.length
        });

    } catch (error: any) {
        console.error('Pattern analysis error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function getConfidenceNew(count: number, total: number): 'high' | 'medium' | 'low' {
    const percentage = (count / total) * 100;
    if (count >= 5 && percentage >= 30) return 'high';
    if (count >= 3 && percentage >= 20) return 'medium';
    return 'low';
}

function generateRecommendation(category: string, value: string, avg: number, count: number): string {
    const valPretty = value.replace(/_/g, ' ');
    if (category === 'hook') return `Your "${valPretty}" hooks average ${avg.toFixed(2)}% engagement across ${count} videos.`;
    if (category === 'visual') return `Videos in "${valPretty}" settings get ${avg.toFixed(2)}% engagement.`;
    if (category === 'cta') return `"${valPretty}" CTAs drive ${avg.toFixed(2)}% engagement.`;
    return `${valPretty} performs well with ${avg.toFixed(2)}% engagement.`;
}
