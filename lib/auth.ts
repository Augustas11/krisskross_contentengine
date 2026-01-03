import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";

const providers: NextAuthOptions["providers"] = [
    CredentialsProvider({
        name: "Credentials",
        credentials: {
            email: { label: "Email", type: "email" },
            password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
            if (!credentials?.email) return null;
            // @ts-ignore
            const user = await prisma.user.findUnique({
                where: { email: credentials.email }
            });
            return user || null;
        }
    })
];

if (process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET) {
    providers.push({
        id: "tiktok",
        name: "TikTok",
        type: "oauth",
        clientId: process.env.TIKTOK_CLIENT_KEY,
        clientSecret: process.env.TIKTOK_CLIENT_SECRET,
        authorization: {
            url: "https://www.tiktok.com/v2/auth/authorize/",
            params: {
                client_key: process.env.TIKTOK_CLIENT_KEY,
                scope: "user.info.basic,video.list,video.upload",
                response_type: "code",
            },
        },
        token: "https://open.tiktokapis.com/v2/oauth/token/",
        userinfo: "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name",
        profile(profile) {
            return {
                id: profile.data.user.open_id,
                name: profile.data.user.display_name,
                image: profile.data.user.avatar_url,
                email: null,
            };
        },
    });
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
        async jwt({ token, user }) {
            if (user) {
                token.sub = user.id;
            }
            return token;
        }
    },
};
