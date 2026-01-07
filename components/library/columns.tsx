"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Video, TikTokMetric, VideoAnalysis } from "@prisma/client";
import { format } from "date-fns";
import { ArrowUpDown, MoreHorizontal, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type VideoWithMetrics = Video & {
    currentMetrics: TikTokMetric | null;
    analysis: VideoAnalysis | null;
};

export const columns: ColumnDef<VideoWithMetrics>[] = [
    {
        accessorKey: "filename",
        header: "Video",
        cell: ({ row }) => {
            const video = row.original;
            return (
                <div className="flex items-center gap-2">
                    <div className="bg-muted p-1 rounded">
                        <FileVideo className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col max-w-[200px]">
                        <span className="truncate font-medium text-sm" title={video.hook}>{video.hook}</span>
                        <span className="truncate text-xs text-muted-foreground">{video.filename}</span>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "contentType",
        header: "Type",
        cell: ({ row }) => <span className="text-sm">{row.getValue("contentType") || "-"}</span>,
    },
    {
        accessorKey: "campaignTag",
        header: "Campaign",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.getValue("campaignTag") || "-"}</span>,
    },
    {
        accessorKey: "views",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Views
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const metrics = row.original.currentMetrics;
            return <span className="font-medium">{metrics?.views?.toLocaleString() || "0"}</span>;
        },
    },
    {
        accessorKey: "engagement",
        header: "Engagement",
        cell: ({ row }) => {
            const metrics = row.original.currentMetrics;
            const rate = metrics?.engagementRate ? Number(metrics.engagementRate).toFixed(2) : "0.00";
            return <span>{rate}%</span>;
        },
    },
    {
        accessorKey: "uploadDate",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Date
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => {
            return <span className="text-sm text-muted-foreground">{format(new Date(row.original.uploadDate), "MMM d, yyyy")}</span>
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const video = row.original;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(video.id)}>
                            Copy Video ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Link TikTok URL</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
];
