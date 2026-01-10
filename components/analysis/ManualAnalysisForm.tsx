import React, { useState } from 'react';
import { Upload, Check, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface ManualAnalysisFormProps {
    videoId?: string; // If linking to an existing video
    onSuccess?: () => void;
}

export function ManualAnalysisForm({ videoId, onSuccess }: ManualAnalysisFormProps) {
    const [jsonInput, setJsonInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [preview, setPreview] = useState<any>(null);

    // Validate and preview JSON
    const handlePreview = () => {
        try {
            const parsed = JSON.parse(jsonInput);

            // Basic validation - check required fields
            // We can be a bit more lenient or strict depending on backend.
            // Backend handles nulls, but let's encourage good data.
            const required = ['hook', 'visual', 'classification', 'cta'];
            const missing = required.filter(field => !parsed[field]);

            if (missing.length > 0) {
                throw new Error(`Missing required fields: ${missing.join(', ')}`);
            }

            setPreview(parsed);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid JSON format');
            setPreview(null);
        }
    };

    // Save to database
    const handleSave = async () => {
        if (!preview) {
            setError('Please preview your JSON first');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/analysis/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    videoId: videoId,
                    analysis: preview,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save analysis');
            }

            console.log('✅ Analysis saved:', data);
            setSuccess(true);
            setJsonInput('');
            setPreview(null);
            toast.success('Analysis saved successfully!');

            // Callback
            if (onSuccess) {
                setTimeout(() => onSuccess(), 1500);
            }

        } catch (err) {
            console.error('Save error:', err);
            setError(err instanceof Error ? err.message : 'Failed to save analysis');
            toast.error('Failed to save analysis');
        } finally {
            setLoading(false);
        }
    };

    // Example JSON template
    const exampleJson = {
        hook: {
            text: "Your hook text here",
            type: "curiosity_gap",
            visual_element: "Description of opening visual",
            effectiveness_score: 8,
            duration: 3
        },
        caption: {
            main_text: "Your video caption",
            hashtags: ["hashtag1", "hashtag2"],
            cta: "Link in bio"
        },
        script: {
            full_transcript: "Complete script or narration",
            key_messages: ["Key point 1", "Key point 2"]
        },
        visual: {
            environment: "urban_street",
            lighting: "natural_daylight",
            camera_angles: ["medium_shot"],
            product_display_method: "worn",
            color_palette: ["navy", "white"]
        },
        classification: {
            primary: "lifestyle",
            secondary: "product_demo"
        },
        cta: {
            primary: "Shop now link in bio",
            type: "link_in_bio",
            placement: "closing",
            urgency: "medium"
        },
        campaign: {
            tag: "product_launch_jan2025",
            category: "product_launch"
        },
        performance: {
            views: 10000,
            likes: 500,
            comments: 50,
            shares: 25,
            engagement_rate: 5.75
        }
    };

    const fillExample = () => {
        setJsonInput(JSON.stringify(exampleJson, null, 2));
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-200">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <Upload className="w-6 h-6 text-purple-600" />
                    Store Video Analysis
                </h2>
                <p className="text-gray-600">
                    Paste your structured video analysis JSON to track performance patterns.
                    After 10-15 videos, we'll show you what works best.
                </p>
            </div>

            {success ? (
                // Success state
                <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center transition-all animate-in fade-in zoom-in">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-green-800 mb-2">
                        Analysis Saved! 🎉
                    </h3>
                    <p className="text-green-700">
                        Keep analyzing videos to unlock winning formula insights
                    </p>
                    <button
                        onClick={() => setSuccess(false)}
                        className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                    >
                        Add Another
                    </button>
                </div>
            ) : (
                <>
                    {/* JSON Input */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-4">
                            <label className="block text-sm font-medium text-gray-700">
                                Analysis JSON
                            </label>
                            <button
                                onClick={fillExample}
                                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                            >
                                Load Example Template
                            </button>
                        </div>

                        <textarea
                            value={jsonInput}
                            onChange={(e) => {
                                setJsonInput(e.target.value);
                                // setPreview(null); // Optional: reset preview or keep it old? Resetting is safer.
                                // Actually if they are just fixing a typo, fully resetting is annoying.
                                // Let's only reset preview if they explicitly clear it or click preview again.
                                // But error state should clear.
                                setError(null);
                            }}
                            placeholder="Paste your JSON analysis here..."
                            className="w-full h-96 font-mono text-sm p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                            disabled={loading}
                        />

                        <div className="mt-4 flex gap-3">
                            <button
                                onClick={handlePreview}
                                disabled={!jsonInput.trim() || loading}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                Preview
                            </button>

                            <button
                                onClick={handleSave}
                                disabled={!preview || loading}
                                className="flex-1 px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5" />
                                        Save Analysis
                                    </>
                                )}
                            </button>
                        </div>

                        {error && (
                            <div className="mt-4 flex items-start gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    {/* Preview */}
                    {preview && (
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100 animate-in fade-in slide-in-from-top-4">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-purple-600" />
                                Preview
                            </h3>

                            <div className="grid md:grid-cols-2 gap-4">
                                {/* Hook */}
                                {preview.hook && (
                                    <div className="bg-white rounded-lg p-4 shadow-sm">
                                        <div className="text-xs text-gray-500 mb-1">Hook Type</div>
                                        <div className="font-medium text-purple-700 capitalize">
                                            {preview.hook.type ? preview.hook.type.replace(/_/g, ' ') : 'N/A'}
                                        </div>
                                        <div className="text-sm text-gray-600 mt-2">
                                            Score: {preview.hook.effectiveness_score}/10
                                        </div>
                                    </div>
                                )}

                                {/* Visual Style */}
                                {preview.visual && (
                                    <div className="bg-white rounded-lg p-4 shadow-sm">
                                        <div className="text-xs text-gray-500 mb-1">Visual Style</div>
                                        <div className="font-medium text-blue-700 capitalize">
                                            {preview.visual.environment ? preview.visual.environment.replace(/_/g, ' ') : 'N/A'}
                                        </div>
                                        <div className="text-sm text-gray-600 mt-2">
                                            {preview.visual.lighting ? preview.visual.lighting.replace(/_/g, ' ') : ''}
                                        </div>
                                    </div>
                                )}

                                {/* Content Type */}
                                {preview.classification && (
                                    <div className="bg-white rounded-lg p-4 shadow-sm">
                                        <div className="text-xs text-gray-500 mb-1">Content Type</div>
                                        <div className="font-medium text-green-700 capitalize">
                                            {preview.classification.primary ? preview.classification.primary.replace(/_/g, ' ') : 'N/A'}
                                        </div>
                                    </div>
                                )}

                                {/* CTA */}
                                {preview.cta && (
                                    <div className="bg-white rounded-lg p-4 shadow-sm">
                                        <div className="text-xs text-gray-500 mb-1">CTA Type</div>
                                        <div className="font-medium text-pink-700 capitalize">
                                            {preview.cta.type ? preview.cta.type.replace(/_/g, ' ') : 'N/A'}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {preview.performance && (
                                <div className="mt-4 bg-white rounded-lg p-4 shadow-sm">
                                    <div className="text-xs text-gray-500 mb-2">Performance</div>
                                    <div className="flex gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-600">Views:</span>{' '}
                                            <span className="font-medium">{preview.performance.views?.toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Engagement:</span>{' '}
                                            <span className="font-medium">{preview.performance.engagement_rate}%</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Helper Text */}
                    <div className="mt-6 text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
                        <p className="font-medium mb-2">💡 Tips:</p>
                        <ul className="space-y-1 list-disc list-inside">
                            <li>Click "Load Example Template" to see the required format</li>
                            <li>All JSON field names must match exactly (case-sensitive)</li>
                            <li>{`Use underscore for multi-word values (e.g., "urban_street")`}</li>
                            <li>Performance data is optional but recommended</li>
                        </ul>
                    </div>
                </>
            )}
        </div>
    );
}
