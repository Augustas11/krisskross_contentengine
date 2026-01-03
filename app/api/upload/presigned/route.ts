
import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "@/lib/storage/s3";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Assuming authOptions is exported from here or similar

export async function POST(request: Request) {
    try {
        // Optional: Protect route
        // const session = await getServerSession(authOptions);
        // if (!session) {
        //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        // }

        const body = await request.json();
        const { filename, contentType } = body;

        if (!filename || !contentType) {
            return NextResponse.json(
                { error: "Filename and content type are required" },
                { status: 400 }
            );
        }

        const key = `videos/${Date.now()}-${filename.replace(/\s+/g, "-")}`;
        const bucketName = process.env.S3_BUCKET_NAME;

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: contentType,
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        return NextResponse.json({
            uploadUrl: signedUrl,
            key,
        });
    } catch (error) {
        console.error("Error generating presigned URL:", error);
        return NextResponse.json(
            { error: "Failed to generate upload URL" },
            { status: 500 }
        );
    }
}
