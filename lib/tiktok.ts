
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
