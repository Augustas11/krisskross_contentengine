import { z } from "zod";

export const videoMetadataSchema = z.object({
    hook: z.string().max(280, "Hook must be less than 280 characters").min(1, "Hook is required"),
    caption: z.string().max(2200, "Caption must be less than 2200 characters").min(1, "Caption is required"),
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
});
