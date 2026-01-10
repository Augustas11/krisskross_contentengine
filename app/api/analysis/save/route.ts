import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { videoId, analysis } = await req.json();

        if (!analysis) {
            return NextResponse.json({ error: 'Missing analysis data' }, { status: 400 });
        }

        const userId = session.user.id;

        // Map JSON to Prisma VideoAnalysis model
        // Note: Some fields like 'caption' are on the Video model usually, but we store what we can in VideoAnalysis
        // or we might update Video if videoId is present? 
        // For now, we map what matches VideoAnalysis fields.

        const analysisData: any = {
            userId: userId,
            sourceType: 'manual',
            manualEntryJson: analysis,
            performanceTracked: !!analysis.performance,
            analyzedAt: new Date(),

            // Hook
            hookText: analysis.hook?.text || null,
            hookType: analysis.hook?.type || null,
            hookDurationSeconds: analysis.hook?.duration || null,
            hookVisualElement: analysis.hook?.visual_element || null,
            hookEffectivenessScore: analysis.hook?.effectiveness_score || null,

            // Caption & Script
            captionCta: analysis.caption?.cta || null,
            fullScript: analysis.script?.full_transcript || null,
            scriptKeyMessages: analysis.script?.key_messages || [],
            // voiceoverStyle - not in template usually

            // Visual
            visualEnvironment: analysis.visual?.environment || null,
            visualLighting: analysis.visual?.lighting || null,
            visualCameraAngles: analysis.visual?.camera_angles || [],
            visualProductDisplayMethod: analysis.visual?.product_display_method || null,
            visualColorPalette: analysis.visual?.color_palette || [],

            // Classification
            contentTypePrimary: analysis.classification?.primary || null,
            contentTypeSecondary: analysis.classification?.secondary || null,

            // CTA
            ctaPrimary: analysis.cta?.primary || null,
            ctaType: analysis.cta?.type || null,
            ctaPlacement: analysis.cta?.placement || null,
            ctaUrgencyLevel: analysis.cta?.urgency || null,

            // Campaign
            campaignCategory: analysis.campaign?.category || null,
        };

        if (videoId) {
            analysisData.videoId = videoId;
        }

        // Upsert or Create?
        // If videoId exists, we might want to upsert to replace existing analysis for this video
        // But VideoAnalysis videoId is unique.

        let savedAnalysis;

        if (videoId) {
            savedAnalysis = await prisma.videoAnalysis.upsert({
                where: { videoId: videoId },
                update: analysisData,
                create: analysisData,
            });

            // Update video status
            await prisma.video.update({
                where: { id: videoId },
                data: {
                    analysisStatus: 'completed',
                    // Optionally update video metadata if empty?
                    // caption: analysis.caption?.main_text 
                },
            });
        } else {
            // Just create a standalone manual analysis
            savedAnalysis = await prisma.videoAnalysis.create({
                data: analysisData,
            });
        }

        return NextResponse.json({ success: true, data: savedAnalysis });

    } catch (error: any) {
        console.error('Error saving manual analysis:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        );
    }
}
