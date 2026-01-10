/**
 * TikTok oEmbed API utility
 * Fetches video metadata (including thumbnail) from TikTok's public oEmbed endpoint.
 * No authentication required.
 */

export interface TikTokOEmbedResponse {
    title: string;
    author_name: string;
    author_url: string;
    thumbnail_url: string;
    thumbnail_width: number;
    thumbnail_height: number;
    html: string;
    provider_name: string;
    provider_url: string;
    version: string;
    type: string;
}

export interface TikTokOEmbedResult {
    thumbnailUrl: string | null;
    title: string | null;
    authorName: string | null;
}

/**
 * Fetches TikTok video metadata via the public oEmbed API.
 * This works without authentication for any public TikTok video URL.
 * 
 * @param tiktokUrl - The full TikTok video URL (e.g., https://www.tiktok.com/@user/video/123)
 * @returns Object containing thumbnailUrl, title, and authorName (all nullable)
 */
export async function fetchTikTokOEmbed(tiktokUrl: string): Promise<TikTokOEmbedResult> {
    try {
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(tiktokUrl)}`;

        const response = await fetch(oembedUrl, {
            method: "GET",
            headers: {
                "Accept": "application/json",
            },
        });

        if (!response.ok) {
            console.warn(`[TikTok oEmbed] Failed to fetch: ${response.status} ${response.statusText}`);
            return { thumbnailUrl: null, title: null, authorName: null };
        }

        const data: TikTokOEmbedResponse = await response.json();

        return {
            thumbnailUrl: data.thumbnail_url || null,
            title: data.title || null,
            authorName: data.author_name || null,
        };
    } catch (error) {
        console.error("[TikTok oEmbed] Error fetching metadata:", error);
        return { thumbnailUrl: null, title: null, authorName: null };
    }
}
