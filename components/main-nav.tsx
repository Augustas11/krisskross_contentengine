"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Upload, Library, Menu } from "lucide-react";

interface MainNavProps {
    user?: {
        name?: string | null;
        image?: string | null;
        email?: string | null;
    };
}

export function MainNav({ user }: MainNavProps) {
    const pathname = usePathname();

    const links = [
        { href: "/", label: "Dashboard", icon: LayoutDashboard },
        { href: "/library", label: "Library", icon: Library },
        { href: "/upload", label: "Upload", icon: Upload },
    ];

    return (
        <div className="border-b bg-background">
            <div className="flex h-16 items-center px-4 md:px-6 max-w-7xl mx-auto">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl mr-6">
                    <img src="/logo.png" alt="KrissKross Logo" className="h-8 w-auto" />
                    <span className="hidden sm:inline-block">KrissKross <span className="text-muted-foreground font-normal">Content Engine</span></span>
                </Link>
                <nav className="flex items-center space-x-4 lg:space-x-6 mx-6">
                    {links.map((link) => {
                        const Icon = link.icon;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "text-sm font-medium transition-colors hover:text-primary flex items-center gap-2",
                                    pathname === link.href
                                        ? "text-foreground"
                                        : "text-muted-foreground"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {link.label}
                            </Link>
                        )
                    })}
                </nav>
                <div className="ml-auto flex items-center space-x-4">
                    {user ? (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium hidden md:inline-block">
                                {user.name}
                            </span>
                            <Button variant="ghost" size="icon" className="rounded-full overflow-hidden">
                                {user.image ? (
                                    <img src={user.image} alt={user.name || "User"} className="h-8 w-8 object-cover" />
                                ) : (
                                    <div className="h-8 w-8 bg-muted flex items-center justify-center">
                                        <span className="text-xs font-medium">
                                            {user.name?.charAt(0).toUpperCase() || "U"}
                                        </span>
                                    </div>
                                )}
                            </Button>
                        </div>
                    ) : (
                        <Button variant="ghost" size="icon">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-xs font-medium">KD</span>
                            </div>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
