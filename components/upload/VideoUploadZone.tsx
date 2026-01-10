"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { videoMetadataSchema } from "@/lib/schemas/video";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { LinkIcon, UploadCloud, FileVideo, X } from "lucide-react";
import { useDropzone } from "react-dropzone";

type VideoFormValues = z.infer<typeof videoMetadataSchema>;

export function VideoUploadZone() {
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const form = useForm<VideoFormValues>({
        resolver: zodResolver(videoMetadataSchema),
        defaultValues: {
            tiktokUrl: "",
            hook: "",
            caption: "",
            script: "",
            description: "",
            targetAudience: [],
        },
    });

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles?.[0]) {
            setSelectedFile(acceptedFiles[0]);
            form.setValue("filename", acceptedFiles[0].name);
            // Clear errors for potentially exclusive fields if needed
        }
    }, [form]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'video/*': ['.mp4', '.mov', '.avi', '.webm']
        },
        maxFiles: 1,
        multiple: false
    });

    const removeFile = () => {
        setSelectedFile(null);
        form.setValue("filename", undefined);
    };

    async function onSubmit(data: VideoFormValues) {
        if (!selectedFile && !data.tiktokUrl && !data.embedCode) {
            toast.error("Please provide a video file, TikTok URL, or embed code");
            return;
        }

        setUploading(true);

        try {
            let fileUrl = "";

            if (selectedFile) {
                // 1. Get Presigned URL
                const presignedRes = await fetch("/api/upload/presigned", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        filename: selectedFile.name,
                        contentType: selectedFile.type
                    })
                });

                if (!presignedRes.ok) {
                    const err = await presignedRes.json();
                    throw new Error(err.error || "Failed to get upload URL");
                }

                const { uploadUrl, key } = await presignedRes.json();

                // 2. Upload to S3
                const uploadRes = await fetch(uploadUrl, {
                    method: "PUT",
                    body: selectedFile,
                    headers: { "Content-Type": selectedFile.type }
                });

                if (!uploadRes.ok) throw new Error("Failed to upload file to storage");

                fileUrl = key; // Storing the storage key
            }

            const payload = {
                ...data,
                fileUrl: fileUrl || undefined,
                filename: selectedFile?.name || undefined,
            };

            const response = await fetch("/api/videos", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Submission failed");
            }

            const result = await response.json();
            toast.success("Video asset saved successfully!");
            console.log("Added:", result);

            // Reset form
            form.reset();
            setSelectedFile(null);
            setUploading(false);

        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Something went wrong");
            setUploading(false);
        }
    }

    return (
        <div className="grid gap-6 max-w-2xl mx-auto">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                    {/* File Upload Zone */}
                    <div className="space-y-2">
                        <FormLabel>Video Source</FormLabel>
                        {!selectedFile ? (
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50"
                                    }`}
                            >
                                <input {...getInputProps()} />
                                <div className="flex flex-col items-center gap-2">
                                    <UploadCloud className="h-10 w-10 text-muted-foreground" />
                                    <p className="text-sm font-medium">
                                        Drag & drop video here, or click to select
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        MP4, MOV, AVI up to 500MB
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 p-4 border rounded-lg bg-card">
                                <FileVideo className="h-8 w-8 text-primary" />
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>
                                </div>
                                <Button type="button" variant="ghost" size="icon" onClick={removeFile}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or link existing</span>
                        </div>
                    </div>

                    <FormField
                        control={form.control}
                        name="tiktokUrl"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>TikTok URL</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <LinkIcon className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                        <Input className="pl-10" placeholder="https://www.tiktok.com/@user/video/..." {...field} disabled={uploading} />
                                    </div>
                                </FormControl>
                                <FormDescription>Optional if uploading a file</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="embedCode"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>TikTok Embed Code</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder='Paste TikTok embed code here... (e.g., <blockquote class="tiktok-embed" ...)'
                                        className="resize-none font-mono text-xs h-24"
                                        {...field}
                                        disabled={uploading}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Get embed code from TikTok: Share → Embed → Copy code
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="hook"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Hook *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="First 3 seconds of spoken text..." {...field} disabled={uploading} />
                                    </FormControl>
                                    <FormDescription>Max 280 characters</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="caption"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Caption *</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="TikTok caption with hashtags..." className="resize-none h-10 min-h-[40px]" {...field} disabled={uploading} />
                                    </FormControl>
                                    <FormDescription>Max 2200 characters</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="script"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Full Script *</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Video transcript or outline..." className="min-h-[100px]" {...field} disabled={uploading} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Visual Description *</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="What's happening on screen (scenes, b-roll)..." className="min-h-[80px]" {...field} disabled={uploading} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid gap-4 md:grid-cols-3">
                        <FormField
                            control={form.control}
                            name="contentType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Content Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={uploading}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Product Demo">Product Demo</SelectItem>
                                            <SelectItem value="Testimonial">Testimonial</SelectItem>
                                            <SelectItem value="Problem-Solution">Problem-Solution</SelectItem>
                                            <SelectItem value="Educational">Educational</SelectItem>
                                            <SelectItem value="Behind-the-Scenes">Behind-the-Scenes</SelectItem>
                                            <SelectItem value="Trend/Meme">Trend/Meme</SelectItem>
                                            <SelectItem value="Comparison">Comparison</SelectItem>
                                            <SelectItem value="Tutorial">Tutorial</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="cta"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Call to Action</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={uploading}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select CTA" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Link in Bio">Link in Bio</SelectItem>
                                            <SelectItem value="Visit Website">Visit Website</SelectItem>
                                            <SelectItem value="Comment for Details">Comment for Details</SelectItem>
                                            <SelectItem value="Try Free">Try Free</SelectItem>
                                            <SelectItem value="Book Call">Book Call</SelectItem>
                                            <SelectItem value="Follow for More">Follow for More</SelectItem>
                                            <SelectItem value="None">None</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="campaignTag"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Campaign Tag</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. US_Launch_Dec2024" {...field} disabled={uploading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={uploading}>
                        {uploading ? "Saving..." : "Save Video Asset"}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
