"use client";

import * as React from "react";
import { Play, TrendingUp, Tag, MessageCircle, Eye, Zap, ChevronDown, ChevronUp, Trash2, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface VideoAnalysis {
    id: string;
    hookText: string | null;
    hookType: string | null;
    hookDurationSeconds: number | null;
    hookVisualElement: string | null;
    hookEffectivenessScore: number | null;
    captionCta: string | null;
    fullScript: string | null;
    scriptKeyMessages: string[];
    voiceoverStyle: string | null;
    visualEnvironment: string | null;
    visualLighting: string | null;
    visualCameraAngles: string[];
    visualModelDescription: string | null;
    visualProductDisplayMethod: string | null;
    visualColorPalette: string[];
    contentTypePrimary: string | null;
    contentTypeSecondary: string | null;
    ctaPrimary: string | null;
    ctaType: string | null;
    ctaPlacement: string | null;
    ctaUrgencyLevel: string | null;
    campaignCategory: string | null;
    analysisConfidenceScore: number | null;
    needsHumanReview: boolean;
}

interface VideoMetrics {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagementRate: number | null;
}

export interface VideoCardData {
    id: string;
    filename: string;
    thumbnailUrl: string | null;
    embedCode: string | null;
    hook: string;
    caption: string;
    description: string;
    tiktokUrl: string | null;
    fileUrl: string;
    campaignTag: string | null;
    contentType: string | null;
    analysisStatus: string | null;
    currentMetrics: VideoMetrics | null;
    analysis: VideoAnalysis | null;
}

interface VideoCardProps {
    video: VideoCardData;
    onVideoClick?: (video: VideoCardData) => void;
    onAnalyzeClick?: (videoId: string) => void;
    onDeleteClick?: (videoId: string) => void;
}

export function VideoCard({ video, onVideoClick, onAnalyzeClick, onDeleteClick }: VideoCardProps) {
    const [isExpanded, setIsExpanded] = React.useState(false);

    const hasAnalysis = video.analysis !== null;
    const isAnalyzing = video.analysisStatus === "processing";
    const isPending = video.analysisStatus === "pending";
    const needsReview = video.analysis?.needsHumanReview || false;

    // Get engagement rate
    const engagementRate = video.currentMetrics?.engagementRate
        ? Number(video.currentMetrics.engagementRate).toFixed(2)
        : null;

    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200 bg-white dark:bg-slate-900">
            {/* Thumbnail with overlays */}
            <div
                className="relative aspect-[9/16] bg-slate-100 dark:bg-slate-800 cursor-pointer group"
                onClick={() => onVideoClick?.(video)}
            >
                {video.thumbnailUrl ? (
                    <img
                        src={video.thumbnailUrl}
                        alt={video.filename}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-12 h-12 text-slate-400" />
                    </div>
                )}

                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                    <Play className="w-16 h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="white" />
                </div>

                {/* Actions menu (top right) */}
                <div className="absolute top-2 right-2 flex items-center gap-1">
                    {engagementRate && (
                        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-white text-xs font-semibold">
                                {engagementRate}%
                            </span>
                        </div>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 bg-black/70 hover:bg-black/90 text-white"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteClick?.(video.id);
                                }}
                                className="text-red-600 focus:text-red-600"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Video
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Content type badge (top left) */}
                {(hasAnalysis && video.analysis?.contentTypePrimary) && (
                    <Badge
                        className="absolute top-2 left-2 bg-violet-600 hover:bg-violet-700 text-white text-xs"
                    >
                        {formatLabel(video.analysis.contentTypePrimary)}
                    </Badge>
                )}

                {/* Status indicators (bottom) */}
                <div className="absolute bottom-2 left-2 right-2 flex gap-1">
                    {isAnalyzing && (
                        <Badge variant="outline" className="bg-amber-500/90 text-white border-0 text-xs">
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-1" />
                            Analyzing...
                        </Badge>
                    )}
                    {needsReview && (
                        <Badge variant="outline" className="bg-orange-500/90 text-white border-0 text-xs">
                            Needs Review
                        </Badge>
                    )}
                </div>
            </div>

            <CardContent className="p-4 space-y-3">
                {!hasAnalysis && isPending ? (
                    // Pending analysis state
                    <div className="space-y-2">
                        <p className="text-sm text-slate-500 line-clamp-2">{video.hook}</p>
                        <Button
                            onClick={() => onAnalyzeClick?.(video.id)}
                            size="sm"
                            variant="outline"
                            className="w-full"
                        >
                            <Zap className="w-4 h-4 mr-2" />
                            Analyze Video
                        </Button>
                    </div>
                ) : hasAnalysis ? (
                    <>
                        {/* Hook preview */}
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                {video.analysis?.hookType && (
                                    <span className="text-xs font-semibold text-violet-600 uppercase">
                                        {formatLabel(video.analysis.hookType)}
                                    </span>
                                )}
                                {video.analysis?.hookEffectivenessScore && (
                                    <span className="text-xs text-slate-400">
                                        {video.analysis.hookEffectivenessScore}/10
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 italic">
                                &ldquo;{video.analysis?.hookText || video.hook}&rdquo;
                            </p>
                        </div>

                        {/* Performance metrics */}
                        {video.currentMetrics && (
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                <div className="flex items-center gap-1">
                                    <Eye className="w-4 h-4" />
                                    <span>{formatNumber(video.currentMetrics.views)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <MessageCircle className="w-4 h-4" />
                                    <span>{formatNumber(video.currentMetrics.likes)}</span>
                                </div>
                            </div>
                        )}

                        {/* Campaign tag */}
                        {video.campaignTag && (
                            <div className="flex items-center gap-1">
                                <Tag className="w-3.5 h-3.5 text-violet-600" />
                                <span className="text-xs font-medium text-violet-600">
                                    {video.campaignTag}
                                </span>
                            </div>
                        )}

                        {/* Expandable details */}
                        {isExpanded && video.analysis && (
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in duration-200">
                                {/* Full Caption */}
                                {video.caption && (
                                    <div>
                                        <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Caption</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
                                            {video.caption}
                                        </p>
                                    </div>
                                )}

                                {/* Key Messages */}
                                {video.analysis.scriptKeyMessages?.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Key Messages</h4>
                                        <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-0.5">
                                            {video.analysis.scriptKeyMessages.slice(0, 3).map((msg, i) => (
                                                <li key={i} className="line-clamp-1">{msg}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Visual Style Tags */}
                                <div className="flex flex-wrap gap-1.5">
                                    {video.analysis.visualEnvironment && (
                                        <Badge variant="secondary" className="text-xs">
                                            {formatLabel(video.analysis.visualEnvironment)}
                                        </Badge>
                                    )}
                                    {video.analysis.visualLighting && (
                                        <Badge variant="secondary" className="text-xs">
                                            {formatLabel(video.analysis.visualLighting)}
                                        </Badge>
                                    )}
                                    {video.analysis.visualProductDisplayMethod && (
                                        <Badge variant="secondary" className="text-xs">
                                            {formatLabel(video.analysis.visualProductDisplayMethod)}
                                        </Badge>
                                    )}
                                </div>

                                {/* CTA */}
                                {video.analysis.ctaPrimary && (
                                    <div>
                                        <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Call-to-Action</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            <span className="font-medium">{formatLabel(video.analysis.ctaType || "none")}:</span>{" "}
                                            {video.analysis.ctaPrimary}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Expand/Collapse button */}
                        <Button
                            onClick={() => setIsExpanded(!isExpanded)}
                            variant="ghost"
                            size="sm"
                            className="w-full text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                        >
                            {isExpanded ? (
                                <>
                                    <ChevronUp className="w-4 h-4 mr-1" />
                                    Show Less
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="w-4 h-4 mr-1" />
                                    View Analysis
                                </>
                            )}
                        </Button>
                    </>
                ) : (
                    // No analysis yet, loading state
                    <div className="flex items-center gap-2 text-slate-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-violet-600 border-t-transparent" />
                        <span className="text-sm">Processing...</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Helper functions
function formatLabel(text: string): string {
    return text
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
}
