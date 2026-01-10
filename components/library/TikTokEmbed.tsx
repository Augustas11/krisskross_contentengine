"use client";

import { useEffect, useRef, useState } from "react";

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
    const [key, setKey] = useState(0);

    useEffect(() => {
        if (!embedCode || !containerRef.current) return;

        // Strip any existing script tags from embed code (we load it separately)
        const cleanedCode = embedCode.replace(/<script[^>]*>.*?<\/script>/gi, "");

        // Set the embed HTML
        containerRef.current.innerHTML = cleanedCode;

        // Remove existing TikTok embed script to force reload
        const existingScripts = document.querySelectorAll('script[src*="tiktok.com/embed"]');
        existingScripts.forEach(script => script.remove());

        // Clear any existing TikTok embed state
        if ((window as any).tiktokEmbed) {
            delete (window as any).tiktokEmbed;
        }

        // Load the TikTok embed script fresh
        const script = document.createElement("script");
        script.src = "https://www.tiktok.com/embed.js";
        script.async = true;
        script.onload = () => {
            // Script loaded, it will auto-initialize embeds
            console.log("[TikTok Embed] Script loaded");
        };
        document.body.appendChild(script);

        // Cleanup
        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = "";
            }
        };
    }, [embedCode, key]);

    // Force re-render on mount
    useEffect(() => {
        const timer = setTimeout(() => setKey(k => k + 1), 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{
                minHeight: "400px",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
                overflow: "auto"
            }}
        />
    );
}
