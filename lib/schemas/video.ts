import { z } from "zod";

export const videoMetadataSchema = z.object({
    tiktokUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
    fileUrl: z.string().url("Invalid File URL").optional(),
    filename: z.string().optional(),
    hook: z.string().min(1, "Hook is required").max(280),
    caption: z.string().min(1, "Caption is required").max(2200),
    script: z.string().min(1, "Script is required"),
    description: z.string().min(1, "Description is required"),
    contentType: z.enum([
        "Product Demo",
        "Testimonial",
        "Problem-Solution",
        "Educational",
        "Behind-the-Scenes",
        "Trend/Meme",
        "Comparison",
        "Tutorial"
    ]).optional(),
    targetAudience: z.array(z.string()).optional(),
    cta: z.enum([
        "Link in Bio",
        "Visit Website",
        "Comment for Details",
        "Try Free",
        "Book Call",
        "Follow for More",
        "None"
    ]).optional(),
    campaignTag: z.string().optional(),
    embedCode: z.string().optional(),
});
