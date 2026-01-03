"use client";

import { useState } from "react";
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
import { LinkIcon } from "lucide-react";

type VideoFormValues = z.infer<typeof videoMetadataSchema>;

export function VideoUploadZone() {
    const [uploading, setUploading] = useState(false);

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

    async function onSubmit(data: VideoFormValues) {
        setUploading(true);

        try {
            const response = await fetch("/api/videos", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Submission failed");
            }

            const result = await response.json();
            toast.success("Video added successfully!");
            console.log("Added:", result);

            // Reset form
            form.reset();
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

                    <FormField
                        control={form.control}
                        name="tiktokUrl"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>TikTok URL *</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <LinkIcon className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                        <Input className="pl-10" placeholder="https://www.tiktok.com/@user/video/..." {...field} disabled={uploading} />
                                    </div>
                                </FormControl>
                                <FormDescription>Link to the uploaded TikTok video</FormDescription>
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
