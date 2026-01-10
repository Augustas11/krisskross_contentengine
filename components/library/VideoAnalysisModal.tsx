"use client";

import * as React from "react";
import { X, Zap, Eye, MessageCircle, Share2, Heart, Tag, TrendingUp, Code } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { VideoCardData } from "./VideoCard";
import { TikTokEmbed } from "./TikTokEmbed";

interface VideoAnalysisModalProps {
    video: VideoCardData | null;
    isOpen: boolean;
    onClose: () => void;
    onAnalyze?: (videoId: string, force?: boolean) => void;
}

export function VideoAnalysisModal({ video, isOpen, onClose, onAnalyze }: VideoAnalysisModalProps) {
    const [showJson, setShowJson] = React.useState(false);

    // Handle escape key
    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    if (!isOpen || !video) return null;

    const analysis = video.analysis;
    const metrics = video.currentMetrics;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-slate-900 rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center z-10">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Video Analysis
                    </h2>
                    <div className="flex items-center gap-2">
                        {analysis && (
                            <Button
                                onClick={() => setShowJson(!showJson)}
                                variant="ghost"
                                size="sm"
                                className={`text-slate-500 hover:text-violet-600 ${showJson ? "bg-slate-100 dark:bg-slate-800 text-violet-600" : ""}`}
                            >
                                <Code className="w-4 h-4 mr-1" />
                                {showJson ? "View UI" : "JSON"}
                            </Button>
                        )}
                        {analysis && onAnalyze && (
                            <Button
                                onClick={() => onAnalyze(video.id, true)}
                                variant="outline"
                                size="sm"
                                className="text-violet-600 border-violet-300 hover:bg-violet-50"
                            >
                                <Zap className="w-4 h-4 mr-1" />
                                Re-analyze
                            </Button>
                        )}
                        <Button
                            onClick={onClose}
                            variant="ghost"
                            size="icon"
                            className="text-slate-500 hover:text-slate-700"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
                    {showJson ? (
                        <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                            <pre className="text-sm font-mono text-green-400 whitespace-pre-wrap">
                                {analysis?.manualEntryJson
                                    ? JSON.stringify(analysis.manualEntryJson, null, 2)
                                    : JSON.stringify(analysis, (key, value) => {
                                        // Filter out internal fields if constructing from flat
                                        if (key === 'manualEntryJson') return undefined;
                                        return value;
                                    }, 2)
                                }
                            </pre>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Left: Video & Performance */}
                            <div className="space-y-4">
                                {/* Video Thumbnail/Player */}
                                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                                    {video.embedCode ? (
                                        <TikTokEmbed
                                            embedCode={video.embedCode}
                                            className="w-full"
                                        />
                                    ) : video.thumbnailUrl ? (
                                        <div className="aspect-[9/16]">
                                            <img
                                                src={video.thumbnailUrl}
                                                alt={video.filename}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="aspect-[9/16] w-full flex items-center justify-center text-slate-400">
                                            No Preview Available
                                        </div>
                                    )}
                                </div>

                                {/* Performance Metrics Grid */}
                                {metrics && (
                                    <div className="grid grid-cols-3 gap-2">
                                        <MetricCard
                                            icon={<Eye className="w-5 h-5" />}
                                            value={formatNumber(metrics.views)}
                                            label="Views"
                                            color="blue"
                                        />
                                        <MetricCard
                                            icon={<Heart className="w-5 h-5" />}
                                            value={formatNumber(metrics.likes)}
                                            label="Likes"
                                            color="pink"
                                        />
                                        <MetricCard
                                            icon={<TrendingUp className="w-5 h-5" />}
                                            value={`${metrics.engagementRate ? Number(metrics.engagementRate).toFixed(2) : 0}%`}
                                            label="Engagement"
                                            color="green"
                                        />
                                        <MetricCard
                                            icon={<MessageCircle className="w-5 h-5" />}
                                            value={formatNumber(metrics.comments)}
                                            label="Comments"
                                            color="purple"
                                        />
                                        <MetricCard
                                            icon={<Share2 className="w-5 h-5" />}
                                            value={formatNumber(metrics.shares)}
                                            label="Shares"
                                            color="orange"
                                        />
                                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
                                            {video.tiktokUrl && (
                                                <a
                                                    href={video.tiktokUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-violet-600 hover:underline"
                                                >
                                                    View on TikTok →
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right: Analysis Details */}
                            <div className="space-y-5">
                                {analysis ? (
                                    <>
                                        {/* Hook Analysis */}
                                        <AnalysisSection title="Hook Analysis" icon={<Zap className="w-5 h-5 text-amber-500" />}>
                                            <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 rounded-lg p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    {analysis.hookType && (
                                                        <Badge className="bg-violet-600 text-white">
                                                            {formatLabel(analysis.hookType)}
                                                        </Badge>
                                                    )}
                                                    {analysis.hookEffectivenessScore && (
                                                        <span className="text-lg font-bold text-violet-600">
                                                            {analysis.hookEffectivenessScore}/10
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                                                    &ldquo;{analysis.hookText || video.hook}&rdquo;
                                                </p>
                                                {analysis.hookVisualElement && (
                                                    <p className="text-xs text-slate-500 mt-2">
                                                        Visual: {analysis.hookVisualElement}
                                                    </p>
                                                )}
                                            </div>
                                        </AnalysisSection>

                                        <Separator />

                                        {/* Caption & Script */}
                                        <AnalysisSection title="Caption & Script">
                                            <div className="space-y-3">
                                                <div>
                                                    <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Caption</h4>
                                                    <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                                                        {video.caption || "No caption"}
                                                    </p>
                                                </div>

                                                {analysis.fullScript && (
                                                    <div>
                                                        <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Script</h4>
                                                        <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg p-3 whitespace-pre-wrap">
                                                            {analysis.fullScript}
                                                        </p>
                                                    </div>
                                                )}

                                                {analysis.scriptKeyMessages?.length > 0 && (
                                                    <div>
                                                        <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Key Messages</h4>
                                                        <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300 space-y-1">
                                                            {analysis.scriptKeyMessages.map((msg, i) => (
                                                                <li key={i}>{msg}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </AnalysisSection>

                                        <Separator />

                                        {/* Visual Style */}
                                        <AnalysisSection title="Visual Style">
                                            <div className="grid grid-cols-2 gap-2">
                                                {analysis.visualEnvironment && (
                                                    <StyleTag label="Environment" value={formatLabel(analysis.visualEnvironment)} color="blue" />
                                                )}
                                                {analysis.visualLighting && (
                                                    <StyleTag label="Lighting" value={formatLabel(analysis.visualLighting)} color="yellow" />
                                                )}
                                                {analysis.visualProductDisplayMethod && (
                                                    <StyleTag label="Display" value={formatLabel(analysis.visualProductDisplayMethod)} color="green" />
                                                )}
                                                {analysis.contentTypePrimary && (
                                                    <StyleTag label="Type" value={formatLabel(analysis.contentTypePrimary)} color="purple" />
                                                )}
                                            </div>
                                        </AnalysisSection>

                                        <Separator />

                                        {/* CTA & Campaign */}
                                        <AnalysisSection title="Call-to-Action">
                                            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2">
                                                {analysis.ctaPrimary && (
                                                    <div>
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            {formatLabel(analysis.ctaType || "none")}:
                                                        </span>{" "}
                                                        <span className="text-sm text-slate-600 dark:text-slate-400">
                                                            {analysis.ctaPrimary}
                                                        </span>
                                                    </div>
                                                )}
                                                {analysis.ctaPlacement && (
                                                    <p className="text-xs text-slate-500">
                                                        Placement: {formatLabel(analysis.ctaPlacement)} | Urgency: {formatLabel(analysis.ctaUrgencyLevel || "none")}
                                                    </p>
                                                )}
                                                {video.campaignTag && (
                                                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                                        <Tag className="w-4 h-4 text-violet-600" />
                                                        <span className="text-sm font-medium text-violet-600">
                                                            {video.campaignTag}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </AnalysisSection>

                                        {/* Confidence Score */}
                                        {analysis.analysisConfidenceScore && (
                                            <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                                                <span>Analysis Confidence</span>
                                                <span className={analysis.analysisConfidenceScore >= 0.75 ? "text-green-600" : "text-amber-600"}>
                                                    {(Number(analysis.analysisConfidenceScore) * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full py-12">
                                        <Zap className="w-16 h-16 mb-4 text-violet-300" />
                                        <p className="text-base text-slate-500 mb-4">No analysis available yet</p>
                                        {onAnalyze && (
                                            <Button
                                                onClick={() => onAnalyze(video.id)}
                                                className="bg-violet-600 hover:bg-violet-700 text-white"
                                                size="lg"
                                            >
                                                <Zap className="w-5 h-5 mr-2" />
                                                Analyze This Video
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Sub-components
function AnalysisSection({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section>
            <h3 className="font-semibold text-lg text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                {icon}
                {title}
            </h3>
            {children}
        </section>
    );
}

function MetricCard({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
    const colorClasses: Record<string, string> = {
        blue: "text-blue-600",
        pink: "text-pink-600",
        green: "text-emerald-600",
        purple: "text-purple-600",
        orange: "text-orange-600",
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
            <div className={`flex justify-center mb-1 ${colorClasses[color] || "text-slate-600"}`}>
                {icon}
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
                {value}
            </div>
            <div className="text-xs text-slate-500">{label}</div>
        </div>
    );
}

function StyleTag({ label, value, color }: { label: string; value: string; color: string }) {
    const colorClasses: Record<string, string> = {
        blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
        yellow: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300",
        green: "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300",
        purple: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
    };

    return (
        <div className={`rounded-lg p-3 ${colorClasses[color] || "bg-slate-50 text-slate-700"}`}>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</div>
            <div className="text-sm font-medium">{value}</div>
        </div>
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
