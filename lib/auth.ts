import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }, // NOTE: In prod, use standard password hashing!
            },
            async authorize(credentials) {
                if (!credentials?.email) return null;

                // MVP: Simple check or create user for testing?
                // Ideally we check DB.
                const user = await prisma.user.findUnique({
                    where: { email: credentials.email }
                });

                if (user) {
                    return user;
                }

                // For MVP ease: Auto-create user if not exists (OPTIONAL, risky for prod but good for MVP velocity)
                // Let's NOT auto-create in credentials, standard practice is strict.
                return null;
            }
        }),
    ],
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
