import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

// Generate code_verifier and code_challenge for PKCE
function generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = crypto
        .createHash("sha256")
        .update(codeVerifier)
        .digest("base64url");
    return { codeVerifier, codeChallenge };
}

function generateState() {
    return crypto.randomBytes(16).toString("hex");
}

export async function GET() {
    // DEBUG: Hardcoded Sandbox Key to rule out Env Var issues
    const clientKey = "awqdo697xbzw8cd6"; // process.env.TIKTOK_CLIENT_KEY;

    if (!clientKey) {
        return NextResponse.json({ error: "TikTok client key not configured" }, { status: 500 });
    }

    const { codeVerifier, codeChallenge } = generatePKCE();
    const state = generateState();

    // Store code_verifier and state in cookies for callback verification
    const cookieStore = await cookies();
    cookieStore.set("tiktok_code_verifier", codeVerifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 10, // 10 minutes
        path: "/",
    });
    cookieStore.set("tiktok_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 10,
        path: "/",
    });

    // Build TikTok authorization URL with correct parameters
    // DEBUG: Hardcoding production URI
    const redirectUri = "https://krisskross-contentengine.vercel.app/api/auth/tiktok/callback";

    const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
    authUrl.searchParams.set("client_key", clientKey);
    // DEBUG: Simplified scopes
    authUrl.searchParams.set("scope", "user.info.basic,video.list");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    return NextResponse.redirect(authUrl.toString());
}
