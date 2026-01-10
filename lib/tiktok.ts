
const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

export interface TikTokVideoData {
    id: string;
    title: string;
    video_description: string;
    duration: number;
    cover_image_url: string;
    embed_html: string;
    view_count: number;
    share_count: number;
    like_count: number;
    comment_count: number;
    create_time: number; // Unix timestamp
}

interface TikTokListResponse {
    data: {
        videos: TikTokVideoData[];
        cursor: number;
        has_more: boolean;
    };
    error: {
        code: string;
        message: string;
        log_id: string;
    };
}

export async function fetchTikTokVideos(accessToken: string, cursor: number = 0): Promise<{ videos: TikTokVideoData[], hasMore: boolean, cursor: number | null }> {
    const fields = [
        "id", "title", "video_description", "duration", "cover_image_url", "embed_html",
        "view_count", "share_count", "like_count", "comment_count", "create_time"
    ].join(",");

    const response = await fetch(`${TIKTOK_API_BASE}/video/list/?fields=${fields}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            cursor: cursor,
            max_count: 20 // Adjust as needed
        })
    });

    if (!response.ok) {
        throw new Error(`TikTok API error: ${response.status} ${response.statusText}`);
    }

    const json: TikTokListResponse = await response.json();

    if (json.error.code !== "ok") {
        throw new Error(`TikTok API logic error: ${json.error.message} (Code: ${json.error.code})`);
    }

    return {
        videos: json.data.videos || [],
        hasMore: json.data.has_more,
        cursor: json.data.cursor
    };
}

interface TikTokQueryResponse {
    data: {
        videos: TikTokVideoData[];
    };
    error: {
        code: string;
        message: string;
        log_id: string;
    };
}

/**
 * Fetch a specific TikTok video by its ID using the authenticated API
 * Note: Only works for videos owned by the authenticated user
 */
export async function fetchTikTokVideoById(accessToken: string, videoId: string): Promise<TikTokVideoData | null> {
    const fields = [
        "id", "title", "video_description", "duration", "cover_image_url", "embed_html",
        "view_count", "share_count", "like_count", "comment_count", "create_time"
    ].join(",");

    try {
        const response = await fetch(`${TIKTOK_API_BASE}/video/query/?fields=${fields}`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                filters: {
                    video_ids: [videoId]
                }
            })
        });

        if (!response.ok) {
            console.warn(`[TikTok API] Query failed: ${response.status} ${response.statusText}`);
            return null;
        }

        const json: TikTokQueryResponse = await response.json();

        if (json.error.code !== "ok") {
            console.warn(`[TikTok API] Query error: ${json.error.message} (Code: ${json.error.code})`);
            return null;
        }

        const videos = json.data.videos || [];
        return videos.length > 0 ? videos[0] : null;
    } catch (error) {
        console.error("[TikTok API] Error querying video:", error);
        return null;
    }
}

/**
 * Extract video ID from a TikTok URL
 * Supports formats like:
 * - https://www.tiktok.com/@user/video/1234567890
 * - https://vm.tiktok.com/ZMd3CQdNr/
 */
export function extractTikTokVideoId(url: string): string | null {
    // Standard format: /video/1234567890
    const standardMatch = url.match(/\/video\/(\d+)/);
    if (standardMatch) {
        return standardMatch[1];
    }

    // Short URL format would require following redirects, return null for now
    return null;
}
