export { default } from "next-auth/middleware";

export const config = {
    matcher: ["/dashboard/:path*", "/library/:path*", "/upload/:path*"],
};
