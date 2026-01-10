import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/prisma";
import { Video, TikTokMetric, VideoAnalysis } from "@prisma/client";

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Types for Claude API response
interface ClaudeAnalysisResponse {
    hook: {
        text: string;
        duration: number;
        type: "pattern_interrupt" | "curiosity_gap" | "social_proof" | "problem_agitation" | "bold_claim";
        visualElement: string;
        effectivenessScore: number;
    };
    script: {
        fullTranscript: string;
        keyMessages: string[];
        voiceoverStyle: "professional" | "casual" | "energetic" | "educational";
    };
    visual: {
        environment: "urban_street" | "studio" | "lifestyle_home" | "outdoor_nature" | "other";
        lighting: "natural_daylight" | "studio_lighting" | "golden_hour" | "night" | "mixed";
        cameraAngles: string[];
        modelDescription: string;
        productDisplay: "worn" | "held" | "demonstrated" | "flat_lay" | "other";
        colorPalette: string[];
        sceneBreakdown: Array<{ timestamp: string; description: string; transition: string }>;
    };
    classification: {
        primary: "product_demo" | "lifestyle" | "unboxing" | "testimonial" | "before_after" | "tutorial" | "trend_participation";
        secondary?: string;
    };
    cta: {
        extracted: string;
        primary: string;
        type: "shop_now" | "link_in_bio" | "follow" | "comment" | "duet_stitch" | "visit_page" | "none";
        placement: "opening" | "middle" | "closing" | "throughout" | "none";
        urgency: "high" | "medium" | "low" | "none";
    };
    campaign: {
        category: "product_launch" | "seasonal" | "influencer_collab" | "organic_content";
    };
    performance_factors: {
        strengths: string[];
        winning_patterns: string[];
    };
    metadata: {
        confidence: number;
    };
}

type VideoWithMetrics = Video & {
    metrics: TikTokMetric[];
};

/**
 * Main function to analyze a video with Claude AI
 */
export async function analyzeVideo(
    videoId: string,
    forceReanalysis: boolean = false
): Promise<{ success: boolean; analysisId?: string; needsReview?: boolean; error?: string }> {
    try {
        // 1. Fetch video with latest metrics
        const video = await prisma.video.findUnique({
            where: { id: videoId },
            include: {
                metrics: {
                    orderBy: { collectedAt: "desc" },
                    take: 1,
                },
                analysis: true,
            },
        });

        if (!video) {
            return { success: false, error: "Video not found" };
        }

        // 2. Check if already analyzed (unless force_reanalysis)
        if (!forceReanalysis && video.analysis) {
            return {
                success: true,
                analysisId: video.analysis.id,
                needsReview: video.analysis.needsHumanReview,
            };
        }

        // 3. Update status to processing
        await prisma.video.update({
            where: { id: videoId },
            data: { analysisStatus: "processing" },
        });

        // 4. Get performance data
        const latestMetrics = video.metrics[0];
        const engagementRate = latestMetrics?.engagementRate
            ? Number(latestMetrics.engagementRate)
            : 0;

        // 5. Build prompt and call Claude
        const prompt = buildAnalysisPrompt(video, latestMetrics);

        // Log the prompt being sent to Claude
        console.log("=".repeat(80));
        console.log("[Claude Analysis] PROMPT SENT TO CLAUDE:");
        console.log("=".repeat(80));
        console.log(prompt);
        if (video.thumbnailUrl) {
            console.log("[Claude Analysis] WITH THUMBNAIL IMAGE:", video.thumbnailUrl);
        }
        console.log("=".repeat(80));

        // Build message content - include image if thumbnail available
        const messageContent: Array<{ type: "text"; text: string } | { type: "image"; source: { type: "url"; url: string } }> = [];

        // Add thumbnail image for vision analysis if available
        if (video.thumbnailUrl) {
            messageContent.push({
                type: "image",
                source: {
                    type: "url",
                    url: video.thumbnailUrl,
                },
            });
        }

        // Add the text prompt
        messageContent.push({
            type: "text",
            text: prompt,
        });

        // Try to analyze with image first, but fallback if image download fails
        let response;
        try {
            response = await anthropic.messages.create({
                model: "claude-sonnet-4-20250514", // using latest available model in 2026? or stick to 3.5 in instructions if 4 not avail? The code has "claude-sonnet-4-20250514", assuming it works.
                // If it fails on model name, that's different. But user error was "Unable to download file"
                max_tokens: 2500,
                messages: [
                    {
                        role: "user",
                        content: messageContent,
                    },
                ],
            });
        } catch (error: any) {
            // Handle specific image download error
            if (error.status === 400 && error.error?.error?.message?.includes("Unable to download")) {
                console.warn("[Claude Analysis] Image download failed. Retrying without image...");

                // Fallback: Remove image part and only send text info
                const textOnlyContent = messageContent.filter(c => c.type === "text");

                console.log("[Claude Analysis] Retrying with text-only prompt...");
                response = await anthropic.messages.create({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 2500,
                    messages: [
                        {
                            role: "user",
                            content: textOnlyContent,
                        },
                    ],
                });
            } else {
                throw error; // Re-throw other errors
            }
        }

        // 6. Parse response
        const textContent = response.content.find((c) => c.type === "text");
        if (!textContent || textContent.type !== "text") {
            throw new Error("No text response from Claude");
        }

        // Log Claude's response
        console.log("=".repeat(80));
        console.log("[Claude Analysis] CLAUDE'S RESPONSE:");
        console.log("=".repeat(80));
        console.log(textContent.text);
        console.log("=".repeat(80));

        let analysisData: ClaudeAnalysisResponse;
        try {
            // Extract JSON from response (may be wrapped in markdown code blocks)
            let jsonStr = textContent.text;
            const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            }
            analysisData = JSON.parse(jsonStr.trim());

            // Log parsed analysis
            console.log("[Claude Analysis] PARSED ANALYSIS DATA:");
            console.log(JSON.stringify(analysisData, null, 2));
            console.log("=".repeat(80));
        } catch {
            console.error("Failed to parse Claude response:", textContent.text);
            throw new Error("Failed to parse analysis response");
        }

        // 7. Generate campaign tag
        const campaignTag = generateCampaignTag(analysisData, video);

        // 8. Structure and save analysis
        const needsReview = analysisData.metadata.confidence < 0.75;

        const analysisRecord = await prisma.videoAnalysis.upsert({
            where: { videoId: videoId },
            update: {
                // Hook
                hookText: analysisData.hook.text,
                hookDurationSeconds: analysisData.hook.duration,
                hookType: analysisData.hook.type,
                hookVisualElement: analysisData.hook.visualElement,
                hookEffectivenessScore: analysisData.hook.effectivenessScore,

                // Caption & Script
                captionCta: analysisData.cta.extracted,
                fullScript: analysisData.script.fullTranscript,
                scriptKeyMessages: analysisData.script.keyMessages,
                voiceoverStyle: analysisData.script.voiceoverStyle,

                // Visual
                visualEnvironment: analysisData.visual.environment,
                visualLighting: analysisData.visual.lighting,
                visualCameraAngles: analysisData.visual.cameraAngles,
                visualModelDescription: analysisData.visual.modelDescription,
                visualProductDisplayMethod: analysisData.visual.productDisplay,
                visualColorPalette: analysisData.visual.colorPalette,
                visualSceneBreakdown: analysisData.visual.sceneBreakdown,

                // Content Classification
                contentTypePrimary: analysisData.classification.primary,
                contentTypeSecondary: analysisData.classification.secondary,

                // CTA
                ctaPrimary: analysisData.cta.primary,
                ctaType: analysisData.cta.type,
                ctaPlacement: analysisData.cta.placement,
                ctaUrgencyLevel: analysisData.cta.urgency,

                // Campaign
                campaignCategory: analysisData.campaign.category,

                // Metadata
                analysisConfidenceScore: analysisData.metadata.confidence,
                analysisVersion: "1.0.0",
                needsHumanReview: needsReview,
                analyzedAt: new Date(),

                // Storage of full JSON and source
                manualEntryJson: analysisData as any,
                sourceType: "ai",
            },
            create: {
                videoId: videoId,

                // Hook
                hookText: analysisData.hook.text,
                hookDurationSeconds: analysisData.hook.duration,
                hookType: analysisData.hook.type,
                hookVisualElement: analysisData.hook.visualElement,
                hookEffectivenessScore: analysisData.hook.effectivenessScore,

                // Caption & Script
                captionCta: analysisData.cta.extracted,
                fullScript: analysisData.script.fullTranscript,
                scriptKeyMessages: analysisData.script.keyMessages,
                voiceoverStyle: analysisData.script.voiceoverStyle,

                // Visual
                visualEnvironment: analysisData.visual.environment,
                visualLighting: analysisData.visual.lighting,
                visualCameraAngles: analysisData.visual.cameraAngles,
                visualModelDescription: analysisData.visual.modelDescription,
                visualProductDisplayMethod: analysisData.visual.productDisplay,
                visualColorPalette: analysisData.visual.colorPalette,
                visualSceneBreakdown: analysisData.visual.sceneBreakdown,

                // Content Classification
                contentTypePrimary: analysisData.classification.primary,
                contentTypeSecondary: analysisData.classification.secondary,

                // CTA
                ctaPrimary: analysisData.cta.primary,
                ctaType: analysisData.cta.type,
                ctaPlacement: analysisData.cta.placement,
                ctaUrgencyLevel: analysisData.cta.urgency,

                // Campaign
                campaignCategory: analysisData.campaign.category,

                // Metadata
                analysisConfidenceScore: analysisData.metadata.confidence,
                analysisVersion: "1.0.0",
                needsHumanReview: needsReview,

                // Storage of full JSON and source
                manualEntryJson: analysisData as any,
                sourceType: "ai",
            },
        });

        // 9. Update campaign tag on video if auto-generated and not already set
        if (campaignTag && !video.campaignTag) {
            await prisma.video.update({
                where: { id: videoId },
                data: { campaignTag },
            });
        }

        // 10. Update video status
        await prisma.video.update({
            where: { id: videoId },
            data: {
                analysisStatus: needsReview ? "needs_review" : "completed",
            },
        });

        return {
            success: true,
            analysisId: analysisRecord.id,
            needsReview,
        };
    } catch (error) {
        console.error("Video analysis error:", error);

        // Update video status to failed
        await prisma.video.update({
            where: { id: videoId },
            data: { analysisStatus: "failed" },
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Build the analysis prompt for Claude
 */
function buildAnalysisPrompt(
    video: VideoWithMetrics,
    metrics?: TikTokMetric | null
): string {
    const views = metrics?.views || 0;
    const likes = metrics?.likes || 0;
    const comments = metrics?.comments || 0;
    const shares = metrics?.shares || 0;
    const engagementRate = metrics?.engagementRate
        ? Number(metrics.engagementRate).toFixed(2)
        : "N/A";

    const hasImage = !!video.thumbnailUrl;

    return `You are analyzing a TikTok Shop video for fashion/beauty e-commerce. Extract structured insights.

${hasImage ? "IMPORTANT: I have provided the video thumbnail image above. ANALYZE THE ACTUAL IMAGE to extract visual details including:" : "NOTE: No image provided, infer visuals from text context."}
${hasImage ? "- Any TEXT OVERLAYS visible on the video" : ""}
${hasImage ? "- The actual environment, lighting, and colors you can see" : ""}
${hasImage ? "- The model/person appearance and what they are doing" : ""}
${hasImage ? "- Product display method and positioning" : ""}
${hasImage ? "- Camera angle and framing" : ""}

VIDEO CONTEXT:
- URL: ${video.tiktokUrl || video.fileUrl || "N/A"}
- Title/Hook: ${video.hook || "N/A"}
- Caption: ${video.caption || "N/A"}
- Description: ${video.description || "N/A"}
- Existing Script: ${video.script || "N/A"}
- Duration: ${video.duration ? `${video.duration} seconds` : "Unknown"}

PERFORMANCE:
- Views: ${views}
- Likes: ${likes}
- Comments: ${comments}
- Shares: ${shares}
- Engagement Rate: ${engagementRate}%

ANALYSIS REQUIRED:
Extract and structure the following in JSON format. ${hasImage ? "BASE YOUR VISUAL ANALYSIS ON THE ACTUAL IMAGE PROVIDED, not just the text." : ""}

1. HOOK (first 0-3 seconds):
   - text: ${hasImage ? "Extract any text overlays visible in the image, OR use the caption/hook if no text visible" : "What text or verbal hook is used? Extract from caption/hook field."}
   - duration: Estimate seconds (usually 0-3)
   - type: Classify as one of: "pattern_interrupt", "curiosity_gap", "social_proof", "problem_agitation", "bold_claim"
   - visualElement: ${hasImage ? "Describe what you SEE in the thumbnail image - the actual opening visual" : "Describe likely opening visual based on content"}
   - effectivenessScore: Rate 1-10 based on engagement relative to content type

2. SCRIPT:
   - fullTranscript: Use existing script or infer from caption/description
   - keyMessages: Array of 3-5 main selling points
   - voiceoverStyle: One of "professional", "casual", "energetic", "educational"

3. VISUAL:${hasImage ? " (ANALYZE FROM THE PROVIDED IMAGE)" : ""}
   - environment: One of "urban_street", "studio", "lifestyle_home", "outdoor_nature", "other"
   - lighting: One of "natural_daylight", "studio_lighting", "golden_hour", "night", "mixed"
   - cameraAngles: Array like ["medium_shot", "close_up", "full_body", "product_focus"]
   - modelDescription: ${hasImage ? "Describe the person/model you see in the image (gender, styling, expression, outfit)" : "Infer from context or mark as 'unknown'"}
   - productDisplay: One of "worn", "held", "demonstrated", "flat_lay", "other"
   - colorPalette: ${hasImage ? "Array of the actual dominant colors you see in the image" : "Array of likely dominant colors based on content"}
   - sceneBreakdown: Array of {timestamp: "0-3s", description: "...", transition: "cut/fade/zoom"}

4. CLASSIFICATION:
   - primary: One of "product_demo", "lifestyle", "unboxing", "testimonial", "before_after", "tutorial", "trend_participation"
   - secondary: Optional second type if applicable

5. CTA:
   - extracted: ${hasImage ? "Extract any CTA text visible in the image, or from caption" : "Text of CTA from caption/description"}
   - primary: Main call-to-action text
   - type: One of "shop_now", "link_in_bio", "follow", "comment", "duet_stitch", "visit_page", "none"
   - placement: One of "opening", "middle", "closing", "throughout", "none"
   - urgency: One of "high", "medium", "low", "none"

6. CAMPAIGN:
   - category: One of "product_launch", "seasonal", "influencer_collab", "organic_content"

8. PERFORMANCE FACTORS:
   - strengths: Array of 3-5 specific strong points of this video
   - winning_patterns: Array of 2-3 recognizable patterns (e.g. "Tutorial format", "Feature-first approach")

9. METADATA:
   - confidence: 0.00-1.00 score of analysis confidence (${hasImage ? "higher since you have the actual image" : "lower if limited data"})

Return ONLY valid JSON. No markdown formatting, no explanation.`;
}

/**
 * Generate a campaign tag based on analysis and video data
 */
function generateCampaignTag(
    analysis: ClaudeAnalysisResponse,
    video: Video
): string {
    const date = new Date().toISOString().slice(0, 7); // YYYY-MM
    const contentType = analysis.classification.primary;

    // Check for seasonal keywords in caption
    const caption = (video.caption || "").toLowerCase();
    const seasonalKeywords = [
        "summer",
        "winter",
        "fall",
        "spring",
        "holiday",
        "valentine",
        "newyear",
        "christmas",
        "blackfriday",
    ];

    const seasonalMatch = seasonalKeywords.find((keyword) =>
        caption.includes(keyword)
    );

    if (seasonalMatch) {
        return `${seasonalMatch}_${date}`;
    }

    // Check campaign category
    if (analysis.campaign.category === "product_launch") {
        return `launch_${date}`;
    }

    if (analysis.campaign.category === "influencer_collab") {
        return `collab_${date}`;
    }

    // Default: content type + date
    return `${contentType}_${date}`;
}

/**
 * Batch analyze multiple pending videos
 */
export async function batchAnalyzeVideos(
    limit: number = 10,
    delayMs: number = 2000
): Promise<{ processed: number; successful: number; failed: number }> {
    // Fetch pending videos, prioritized
    const pendingVideos = await prisma.video.findMany({
        where: {
            analysisStatus: "pending",
            deletedAt: null,
        },
        orderBy: [
            { analysisPriority: "desc" },
            { createdAt: "desc" },
        ],
        take: limit,
        select: { id: true },
    });

    let successful = 0;
    let failed = 0;

    for (const video of pendingVideos) {
        const result = await analyzeVideo(video.id);

        if (result.success) {
            successful++;
        } else {
            failed++;
        }

        // Rate limiting delay between API calls
        if (delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }

    return {
        processed: pendingVideos.length,
        successful,
        failed,
    };
}
