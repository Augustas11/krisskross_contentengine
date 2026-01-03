import { VideoUploadZone } from "@/components/upload/VideoUploadZone";

export default function UploadPage() {
    return (
        <div className="container mx-auto py-10 max-w-4xl">
            <div className="mb-8 space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Upload Video Asset</h1>
                <p className="text-muted-foreground">
                    Upload a video and tag it with metadata to start tracking performance.
                </p>
            </div>
            <VideoUploadZone />
        </div>
    );
}
