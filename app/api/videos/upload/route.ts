import { NextRequest, NextResponse } from "next/server";
import { uploadToS3 } from "@/lib/storage/s3";
import prisma from "@/lib/prisma";
import { videoMetadataSchema } from "@/lib/schemas/video";
import { z } from "zod";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Extract metadata
        const rawMetadata = {
            hook: formData.get("hook") as string,
            caption: formData.get("caption") as string,
            script: formData.get("script") as string,
            description: formData.get("description") as string,
            contentType: formData.get("contentType") as any,
            targetAudience: formData.get("targetAudience") ? JSON.parse(formData.get("targetAudience") as string) : [],
            cta: formData.get("cta") as any,
            campaignTag: formData.get("campaignTag") as string,
        };

        // Validate metadata
        const parsedMetadata = videoMetadataSchema.parse(rawMetadata);

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to S3
        const uploadResult = await uploadToS3(buffer, file.name, file.type);

        // Create DB record
        const video = await prisma.video.create({
            data: {
                filename: file.name,
                fileUrl: uploadResult.key, // Storing key for now
                fileSize: file.size,
                contentType: parsedMetadata.contentType,
                // Map other metadata
                hook: parsedMetadata.hook,
                caption: parsedMetadata.caption,
                script: parsedMetadata.script,
                description: parsedMetadata.description,
                targetAudience: parsedMetadata.targetAudience || [],
                cta: parsedMetadata.cta,
                campaignTag: parsedMetadata.campaignTag,
            },
        });

        return NextResponse.json({ success: true, video });
    } catch (error) {
        console.error("Upload error:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Validation failed", details: (error as z.ZodError).errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
