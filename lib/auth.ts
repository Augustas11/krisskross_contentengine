import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

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
