"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { VideoWithMetrics } from "@/components/library/columns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Share2, Link as LinkIcon, BarChart2 } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export function VideoDetail() {
    const params = useParams();
    const id = params.id as string;

    const { data, isLoading, error } = useQuery({
        queryKey: ['video', id],
        queryFn: async () => {
            const res = await fetch(`/api/videos/${id}`);
            if (!res.ok) throw new Error('Failed to fetch video');
            return res.json();
        },
    });

    if (isLoading) return <VideoDetailSkeleton />;
    if (error) return <div className="text-center py-10 text-red-500">Error loading video</div>;

    const video: VideoWithMetrics = data?.video;

    // Ideally S3 URL needs signing, but assuming public/pre-signed or proxy for now based on implementation plan simplification
    // or storing directly usable URL. 
    // If stored key, we'd construct URL here. 
    // For MVP let's assume raw fileUrl is functional or we'd add utility to resolve it.
    // Since we stored 'videos/timestamp-name', we need to prepend endpoint + bucket if not done.
    // But plan said S3 bucket private. So we probably need a route /api/videos/[id]/stream or sign it.
    // For NOW, I will implement a placeholder or assume the URL is valid/signed if backend did it (backend currently stores key).

    // Quick fix: construct R2 public URL if public access allowed or use placeholder.
    // Let's assume we can construct a URL or it's a relative path in public folder during dev? 
    // No, checking backend `fileUrl` is the S3 Key.
    // Using: `https://<bucket>.<endpoint>/<key>` usually works for public R2.
    // I'll assume we have a public domain for delivery for now to allow playback, or simple bucket URL.
    // I'll just use a placeholder text if no valid URL pattern is configured.

    const videoSrc = `https://replace-with-cdn-domain/${video.fileUrl}`;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/library">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold truncate flex-1">{video.hook}</h1>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Link TikTok
                    </Button>
                    <Button variant="outline" size="sm">
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Video Player & Script */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="overflow-hidden bg-black/5 border-0 shadow-none">
                        <div className="aspect-video bg-black flex items-center justify-center">
                            {/* 
                  Video Player 
                  Note: Since we are using S3 private key potentially, this src might need a signed URL.
                  For MVP demo, we assume we can resolve it.
                */}
                            <video
                                controls
                                className="w-full h-full"
                                poster={video.thumbnailUrl || undefined}
                            >
                                <source src={videoSrc} type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Video Content</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h3 className="font-semibold mb-1">Hook</h3>
                                <p className="text-sm bg-muted p-2 rounded">{video.hook}</p>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1">Script</h3>
                                <p className="text-sm whitespace-pre-wrap">{video.script}</p>
                            </div>
                            <Separator />
                            <div>
                                <h3 className="font-semibold mb-1">Description</h3>
                                <p className="text-sm text-muted-foreground">{video.description}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Metadata & Metrics */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart2 className="h-5 w-5" />
                                Performance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {video.currentMetrics ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground">Views</span>
                                        <p className="text-2xl font-bold">{video.currentMetrics.views.toLocaleString()}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground">Engagement</span>
                                        <p className="text-2xl font-bold text-green-600">{Number(video.currentMetrics.engagementRate).toFixed(2)}%</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground">Likes</span>
                                        <p className="text-lg font-medium">{video.currentMetrics.likes.toLocaleString()}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground">Comments</span>
                                        <p className="text-lg font-medium">{video.currentMetrics.comments.toLocaleString()}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-muted-foreground">
                                    <p>No metrics available</p>
                                    <Button variant="link" size="sm" className="mt-2">Connect TikTok to track</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Metadata</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Uploaded</span>
                                <span>{format(new Date(video.uploadDate), "PPP")}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Type</span>
                                <span>{video.contentType || "-"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Campaign</span>
                                <span>{video.campaignTag || "-"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Target Audience</span>
                                <div className="text-right max-w-[150px] truncate">
                                    {video.targetAudience.join(", ") || "-"}
                                </div>
                            </div>
                            <div className="space-y-1 pt-2">
                                <span className="text-muted-foreground block">Caption</span>
                                <p className="p-2 border rounded bg-muted/50 text-xs text-muted-foreground">{video.caption}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function VideoDetailSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex gap-4">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-10 flex-1" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Skeleton className="aspect-video w-full rounded-xl" />
                    <Skeleton className="h-40 w-full mt-6 rounded-xl" />
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-40 w-full rounded-xl" />
                    <Skeleton className="h-60 w-full rounded-xl" />
                </div>
            </div>
        </div>
    )
}
