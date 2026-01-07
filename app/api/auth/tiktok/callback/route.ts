import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
        console.error("TikTok OAuth error:", error);
        return NextResponse.redirect(
            `${process.env.NEXTAUTH_URL || "http://localhost:3000"}?error=tiktok_${error}`
        );
    }

    if (!code || !state) {
        return NextResponse.redirect(
            `${process.env.NEXTAUTH_URL || "http://localhost:3000"}?error=missing_params`
        );
    }

    const cookieStore = await cookies();
    const storedState = cookieStore.get("tiktok_state")?.value;
    const codeVerifier = cookieStore.get("tiktok_code_verifier")?.value;

    // Verify state
    if (state !== storedState) {
        return NextResponse.redirect(
            `${process.env.NEXTAUTH_URL || "http://localhost:3000"}?error=state_mismatch`
        );
    }

    if (!codeVerifier) {
        return NextResponse.redirect(
            `${process.env.NEXTAUTH_URL || "http://localhost:3000"}?error=missing_verifier`
        );
    }

    const origin = process.env.NEXTAUTH_URL || new URL(request.url).origin;
    const redirectUri = `${origin}/api/auth/tiktok/callback`;

    try {
        // Exchange code for token
        const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Cache-Control": "no-cache",
            },
            body: new URLSearchParams({
                client_key: process.env.TIKTOK_CLIENT_KEY!,
                client_secret: process.env.TIKTOK_CLIENT_SECRET!,
                code: code,
                grant_type: "authorization_code",
                redirect_uri: redirectUri,
                code_verifier: codeVerifier,
            }),
        });

        const tokenData = await tokenResponse.json();
        console.log("TikTok token response:", JSON.stringify(tokenData, null, 2));

        if (tokenData.error || !tokenData.access_token) {
            console.error("Token exchange error:", tokenData);
            return NextResponse.redirect(
                `${process.env.NEXTAUTH_URL || "http://localhost:3000"}?error=token_exchange_failed`
            );
        }

        const { access_token, refresh_token, open_id, expires_in } = tokenData;

        // Fetch user info
        const userInfoResponse = await fetch(
            "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name",
            {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            }
        );

        const userInfoData = await userInfoResponse.json();
        console.log("TikTok user info:", JSON.stringify(userInfoData, null, 2));

        const userInfo = userInfoData.data?.user;
        if (!userInfo) {
            return NextResponse.redirect(
                `${process.env.NEXTAUTH_URL || "http://localhost:3000"}?error=user_info_failed`
            );
        }

        // Find or create user and account
        // First, check if we have an existing account with this TikTok open_id
        let account = await prisma.account.findFirst({
            where: {
                provider: "tiktok",
                providerAccountId: open_id,
            },
            include: { user: true },
        });

        if (account) {
            // Update tokens
            await prisma.account.update({
                where: { id: account.id },
                data: {
                    access_token,
                    refresh_token,
                    expires_at: Math.floor(Date.now() / 1000) + expires_in,
                },
            });
        } else {
            // For now, we need to link to an existing user
            // In a real app, you'd handle user creation/linking more carefully
            // Let's find the first user or create a new one
            let user = await prisma.user.findFirst();

            if (!user) {
                user = await prisma.user.create({
                    data: {
                        name: userInfo.display_name,
                        image: userInfo.avatar_url,
                    },
                });
            }

            account = await prisma.account.create({
                data: {
                    userId: user.id,
                    type: "oauth",
                    provider: "tiktok",
                    providerAccountId: open_id,
                    access_token,
                    refresh_token,
                    expires_at: Math.floor(Date.now() / 1000) + expires_in,
                    token_type: "Bearer",
                    scope: "user.info.basic,user.info.profile,user.info.stats,video.list",
                },
                include: { user: true },
            });
        }

        // Clear cookies
        cookieStore.delete("tiktok_code_verifier");
        cookieStore.delete("tiktok_state");

        // Redirect to dashboard with success
        return NextResponse.redirect(
            `${process.env.NEXTAUTH_URL || "http://localhost:3000"}?tiktok=connected`
        );
    } catch (error) {
        console.error("TikTok callback error:", error);
        return NextResponse.redirect(
            `${process.env.NEXTAUTH_URL || "http://localhost:3000"}?error=callback_error`
        );
    }
}
