"use client";

import { useEffect, useRef } from "react";

interface TikTokEmbedProps {
    embedCode: string;
    className?: string;
}

/**
 * Component to render a TikTok embed
 * Loads the TikTok embed.js script and renders the embed HTML
 */
export function TikTokEmbed({ embedCode, className }: TikTokEmbedProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!embedCode || !containerRef.current) return;

        // Set the embed HTML
        containerRef.current.innerHTML = embedCode;

        // Check if TikTok embed script is already loaded
        const existingScript = document.querySelector('script[src="https://www.tiktok.com/embed.js"]');

        if (existingScript) {
            // If script exists, trigger re-render by calling window.tiktokEmbed
            if ((window as any).tiktokEmbed) {
                (window as any).tiktokEmbed.init();
            }
        } else {
            // Load the TikTok embed script
            const script = document.createElement("script");
            script.src = "https://www.tiktok.com/embed.js";
            script.async = true;
            document.body.appendChild(script);
        }

        // Cleanup
        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = "";
            }
        };
    }, [embedCode]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{
                minHeight: "200px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
            }}
        />
    );
}
