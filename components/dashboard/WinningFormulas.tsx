"use client";

import React, { useEffect, useState } from 'react';
import { TrendingUp, Sparkles, Target, Eye, Lightbulb, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PatternInsight {
    category: string;
    attribute: string;
    value: string;
    avg_engagement: number;
    video_count: number;
    confidence_level: 'high' | 'medium' | 'low';
    recommendation: string;
}

export function WinningFormulas() {
    const [insights, setInsights] = useState<PatternInsight[]>([]);
    const [loading, setLoading] = useState(true);
    const [videoCount, setVideoCount] = useState(0);
    const [threshold, setThreshold] = useState(10);
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        loadInsights();
    }, []);

    const loadInsights = async () => {
        try {
            const res = await fetch('/api/analysis/patterns', {
                method: 'POST', // POST to trigger analysis (or GET if we just read cache? The route does logic, so POST is fine)
            });
            const data = await res.json();

            if (data.success) {
                setInsights(data.insights || []);
                setVideoCount(data.total_videos_analyzed);
            } else {
                // Not enough data
                setVideoCount(data.current || 0);
                setCurrent(data.current || 0);
                setThreshold(data.threshold || 10);
            }
        } catch (err) {
            console.error('Failed to load insights:', err);
        } finally {
            setLoading(false);
        }
    };

    const getConfidenceBadge = (level: string) => {
        const styles = {
            high: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
            medium: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
            low: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
        };

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded border ${styles[level as keyof typeof styles]}`}>
                {level} confidence
            </span>
        );
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'hook': return <Target className="w-5 h-5" />;
            case 'visual': return <Eye className="w-5 h-5" />;
            case 'cta': return <Sparkles className="w-5 h-5" />;
            default: return <Lightbulb className="w-5 h-5" />;
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'hook': return 'purple';
            case 'visual': return 'blue';
            case 'cta': return 'pink';
            default: return 'gray';
        }
    };

    // Not enough data yet
    if (!loading && videoCount < threshold) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-12 text-center border border-purple-100 dark:border-purple-800">
                    <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Lock className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                    </div>

                    <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">
                        Winning Formulas Unlocking Soon! 🔓
                    </h2>

                    <p className="text-slate-600 dark:text-slate-300 mb-6 max-w-md mx-auto">
                        Analyze {threshold - videoCount} more videos with performance data to unlock personalized insights.
                    </p>

                    {/* Progress bar */}
                    <div className="max-w-md mx-auto mb-8">
                        <div className="flex justify-between text-sm text-slate-500 mb-2">
                            <span>{videoCount} videos analyzed</span>
                            <span>{threshold} needed</span>
                        </div>
                        <div className="h-4 bg-white dark:bg-slate-700 rounded-full overflow-hidden border border-purple-200 dark:border-purple-800">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                                style={{ width: `${(videoCount / threshold) * 100}%` }}
                            />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 text-left">
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-purple-100 dark:border-purple-800">
                            <div className="text-purple-600 dark:text-purple-400 mb-2">
                                <Target className="w-6 h-6" />
                            </div>
                            <div className="font-medium text-sm mb-1 text-slate-900 dark:text-white">Best Hook Types</div>
                            <div className="text-xs text-slate-500">
                                Discover which hooks drive engagement for YOUR audience
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-purple-100 dark:border-purple-800">
                            <div className="text-blue-600 dark:text-blue-400 mb-2">
                                <Eye className="w-6 h-6" />
                            </div>
                            <div className="font-medium text-sm mb-1 text-slate-900 dark:text-white">Winning Visuals</div>
                            <div className="text-xs text-slate-500">
                                Learn which environments and lighting get the most views
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-purple-100 dark:border-purple-800">
                            <div className="text-pink-600 dark:text-pink-400 mb-2">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div className="font-medium text-sm mb-1 text-slate-900 dark:text-white">Effective CTAs</div>
                            <div className="text-xs text-slate-500">
                                See which call-to-actions drive conversions
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-slate-600 dark:text-slate-400">Analyzing your winning patterns...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Main dashboard
    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-2 text-slate-900 dark:text-white">
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                    Your Winning Formulas
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Based on analysis of {videoCount} videos. Updated automatically as you add more data.
                </p>
            </div>

            {/* Top Insights */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
                {insights.slice(0, 3).map((insight, i) => {
                    const colorKey = getCategoryColor(insight.category);
                    // Simple dynamic color classes are tricky with Tailwind JIT if not safe-listed.
                    // Using explicit styles based on helper.
                    let bgClass = "bg-slate-50 border-slate-200";
                    let iconClass = "text-slate-600";

                    if (colorKey === 'purple') {
                        bgClass = "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800";
                        iconClass = "text-purple-600 dark:text-purple-400";
                    } else if (colorKey === 'blue') {
                        bgClass = "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
                        iconClass = "text-blue-600 dark:text-blue-400";
                    } else if (colorKey === 'pink') {
                        bgClass = "bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800";
                        iconClass = "text-pink-600 dark:text-pink-400";
                    }

                    return (
                        <div key={i} className={`rounded-xl p-6 border ${bgClass}`}>
                            <div className={`mb-3 ${iconClass}`}>
                                {getCategoryIcon(insight.category)}
                            </div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                                {insight.avg_engagement.toFixed(2)}%
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                                avg. engagement
                            </div>
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-200 capitalize">
                                {insight.value.replace(/_/g, ' ')}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                                {insight.video_count} videos
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* All Insights */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">All Detected Patterns</h2>

                {insights.map((insight, i) => {
                    const colorKey = getCategoryColor(insight.category);
                    let iconClass = "text-slate-600";
                    if (colorKey === 'purple') iconClass = "text-purple-600 dark:text-purple-400";
                    else if (colorKey === 'blue') iconClass = "text-blue-600 dark:text-blue-400";
                    else if (colorKey === 'pink') iconClass = "text-pink-600 dark:text-pink-400";

                    return (
                        <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 hover:shadow-md transition">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={iconClass}>
                                        {getCategoryIcon(insight.category)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg capitalize text-slate-900 dark:text-white">
                                            {insight.value.replace(/_/g, ' ')}
                                        </div>
                                        <div className="text-sm text-slate-500 capitalize">
                                            {insight.category} · {insight.attribute}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                        {insight.avg_engagement.toFixed(2)}%
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        avg engagement
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                                {insight.recommendation}
                            </p>

                            <div className="flex items-center gap-3">
                                {getConfidenceBadge(insight.confidence_level)}
                                <span className="text-xs text-slate-500">
                                    Based on {insight.video_count} video{insight.video_count !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Action Prompt */}
            <div className="mt-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
                <h3 className="font-bold text-lg mb-2">
                    🚀 Put These Insights to Work
                </h3>
                <p className="text-white/90 mb-4">
                    Use your winning formulas in the Scene Generator to create videos optimized for YOUR audience.
                </p>
                <Button
                    onClick={() => window.location.href = '/generate'}
                    className="bg-white text-purple-600 hover:bg-slate-100 border-none"
                >
                    Create Video with Winning Formula
                </Button>
            </div>
        </div>
    );
}
