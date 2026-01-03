import { VideoLibrary } from "@/components/library/VideoLibrary";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import Link from "next/link";

export default function LibraryPage() {
    return (
        <div className="container mx-auto py-10 max-w-7xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Content Library</h1>
                    <p className="text-muted-foreground">
                        Manage your video assets and track performance.
                    </p>
                </div>
                <Link href="/upload">
                    <Button>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload New Video
                    </Button>
                </Link>
            </div>
            <VideoLibrary />
        </div>
    );
}
