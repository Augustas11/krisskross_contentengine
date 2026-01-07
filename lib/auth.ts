import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

interface TikTokProfile {
    data: {
        user: {
            open_id: string;
            union_id: string;
            avatar_url: string;
            display_name: string;
        };
    };
}

function TikTokProvider(): any {
    return {
        id: "tiktok",
        name: "TikTok",
        type: "oauth",
        version: "2.0",
        checks: ["pkce", "state"],
        clientId: process.env.TIKTOK_CLIENT_KEY!,
        clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
        authorization: {
            url: "https://www.tiktok.com/v2/auth/authorize/",
            params: {
                client_key: process.env.TIKTOK_CLIENT_KEY,
                scope: "user.info.basic,user.info.profile,user.info.stats,video.list",
                response_type: "code",
                code_challenge_method: "S256",
            },
        },
        token: {
            url: "https://open.tiktokapis.com/v2/oauth/token/",
            async request(context: any) {
                const { code } = context.params;
                const redirectUri = context.provider.callbackUrl;
                const codeVerifier = context.checks.code_verifier;

                const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Cache-Control": "no-cache",
                    },
                    body: new URLSearchParams({
                        client_key: process.env.TIKTOK_CLIENT_KEY!,
                        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
                        code: code as string,
                        grant_type: "authorization_code",
                        redirect_uri: redirectUri,
                        code_verifier: codeVerifier,
                    }),
                });

                const tokens = await response.json();
                return { tokens };
            },
        },
        userinfo: {
            url: "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name",
            async request(context: any) {
                const response = await fetch(
                    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name",
                    {
                        headers: {
                            Authorization: `Bearer ${context.tokens.access_token}`,
                        },
                    }
                );
                return await response.json();
            },
        },
        profile(profile: TikTokProfile) {
            return {
                id: profile.data.user.open_id,
                name: profile.data.user.display_name,
                image: profile.data.user.avatar_url,
                email: null,
            };
        },
    };
}

const providers: NextAuthOptions["providers"] = [
    CredentialsProvider({
        name: "Credentials",
        credentials: {
            email: { label: "Email", type: "email" },
            password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
            if (!credentials?.email || !credentials?.password) return null;
            // @ts-ignore
            const user = await prisma.user.findUnique({
                where: { email: credentials.email }
            });
            if (!user || !user.password) return null;

            const isValid = await bcrypt.compare(credentials.password, user.password);
            if (!isValid) return null;

            return user;
        }
    })
];

if (process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET) {
    providers.push(TikTokProvider());
}

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    providers: providers,
    callbacks: {
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.sub!;
            }
            return session;
        },
        async jwt({ token, user, account }) {
            if (user) {
                token.sub = user.id;
            }
            // Store TikTok access token in JWT for API calls
            if (account?.provider === "tiktok") {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
            }
            return token;
        }
    },
};

