import React, { useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ManualAnalysisForm } from '@/components/analysis/ManualAnalysisForm';

interface ManualAnalysisModalProps {
    videoId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ManualAnalysisModal({ videoId, isOpen, onClose, onSuccess }: ManualAnalysisModalProps) {
    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-slate-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                {/* Header */}
                <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center z-10">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Upload className="w-5 h-5 text-purple-600" />
                        Manual Video Analysis
                    </h2>
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        size="icon"
                        className="text-slate-500 hover:text-slate-700"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Content (Scrollable) */}
                <div className="overflow-y-auto p-0 flex-1">
                    {/* We pass videoId so the form can save it properly */}
                    <ManualAnalysisForm
                        videoId={videoId || undefined}
                        onSuccess={() => {
                            onSuccess();
                            onClose();
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
