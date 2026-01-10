"use client";

import * as React from "react";
import {
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Search, LayoutGrid, List, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { VideoWithMetrics, columns } from "./columns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VideoCard, VideoCardData } from "./VideoCard";
import { VideoAnalysisModal } from "./VideoAnalysisModal";
import { ManualAnalysisModal } from "./ManualAnalysisModal";
import { toast } from "sonner";

type ViewMode = "table" | "grid";

export function VideoLibrary() {
    const queryClient = useQueryClient();
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    // View mode toggle
    const [viewMode, setViewMode] = React.useState<ViewMode>("grid");

    // Modal state
    const [selectedVideo, setSelectedVideo] = React.useState<VideoCardData | null>(null);
    const [isModalOpen, setIsModalOpen] = React.useState(false);

    // Manual Analysis Modal
    const [manualAnalysisVideoId, setManualAnalysisVideoId] = React.useState<string | null>(null);
    const [isManualModalOpen, setIsManualModalOpen] = React.useState(false);

    // Server-side filtering state
    const [search, setSearch] = React.useState("");
    const [contentType, setContentType] = React.useState<string>("all");
    const [sortBy, setSortBy] = React.useState<string>("newest");
    const [page, setPage] = React.useState(1);
    const limit = viewMode === "grid" ? 12 : 10;

    // React Query to fetch data
    const { data, isLoading, refetch } = useQuery({
        queryKey: ["videos", page, search, contentType, sortBy, limit],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search,
                sort: sortBy,
            });
            if (contentType && contentType !== "all") params.append("contentType", contentType);

            const res = await fetch(`/api/videos?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch videos");
            return res.json();
        },
        placeholderData: (previousData) => previousData,
    });

    // Mutation for triggering video analysis
    const analyzeMutation = useMutation({
        mutationFn: async ({ videoId, force = false }: { videoId: string; force?: boolean }) => {
            const url = force
                ? `/api/videos/${videoId}/analyze?force=true`
                : `/api/videos/${videoId}/analyze`;
            const res = await fetch(url, {
                method: "POST",
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || `Analysis failed (${res.status})`);
            }
            return data;
        },
        onSuccess: (_, variables) => {
            toast.success(variables.force ? "Re-analysis started" : "Analysis started", {
                description: "The video is being analyzed with vision. This may take a moment.",
            });
            // Refetch videos to show updated status
            setTimeout(() => refetch(), 3000);
        },
        onError: (error) => {
            toast.error("Analysis failed", {
                description: error.message,
            });
        },
    });

    // Mutation for deleting videos
    const deleteMutation = useMutation({
        mutationFn: async (videoId: string) => {
            const res = await fetch(`/api/videos/${videoId}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || `Delete failed (${res.status})`);
            }
            return data;
        },
        onSuccess: () => {
            toast.success("Video deleted", {
                description: "The video has been removed from your library.",
            });
            refetch();
        },
        onError: (error) => {
            toast.error("Delete failed", {
                description: error.message,
            });
        },
    });

    const videos: VideoWithMetrics[] = data?.data || [];
    const meta = data?.meta || { total: 0, totalPages: 1 };

    // Map videos to VideoCardData format
    const videoCards: VideoCardData[] = videos.map((v) => ({
        id: v.id,
        filename: v.filename,
        thumbnailUrl: v.thumbnailUrl,
        embedCode: v.embedCode,
        hook: v.hook,
        caption: v.caption,
        description: v.description,
        tiktokUrl: v.tiktokUrl,
        fileUrl: v.fileUrl,
        campaignTag: v.campaignTag,
        contentType: v.contentType,
        analysisStatus: v.analysisStatus,
        currentMetrics: v.currentMetrics
            ? {
                views: v.currentMetrics.views,
                likes: v.currentMetrics.likes,
                comments: v.currentMetrics.comments,
                shares: v.currentMetrics.shares,
                engagementRate: v.currentMetrics.engagementRate
                    ? Number(v.currentMetrics.engagementRate)
                    : null,
            }
            : null,
        analysis: v.analysis
            ? {
                id: v.analysis.id,
                hookText: v.analysis.hookText,
                hookType: v.analysis.hookType,
                hookDurationSeconds: v.analysis.hookDurationSeconds,
                hookVisualElement: v.analysis.hookVisualElement,
                hookEffectivenessScore: v.analysis.hookEffectivenessScore,
                captionCta: v.analysis.captionCta,
                fullScript: v.analysis.fullScript,
                scriptKeyMessages: v.analysis.scriptKeyMessages,
                voiceoverStyle: v.analysis.voiceoverStyle,
                visualEnvironment: v.analysis.visualEnvironment,
                visualLighting: v.analysis.visualLighting,
                visualCameraAngles: v.analysis.visualCameraAngles,
                visualModelDescription: v.analysis.visualModelDescription,
                visualProductDisplayMethod: v.analysis.visualProductDisplayMethod,
                visualColorPalette: v.analysis.visualColorPalette,
                contentTypePrimary: v.analysis.contentTypePrimary,
                contentTypeSecondary: v.analysis.contentTypeSecondary,
                ctaPrimary: v.analysis.ctaPrimary,
                ctaType: v.analysis.ctaType,
                ctaPlacement: v.analysis.ctaPlacement,
                ctaUrgencyLevel: v.analysis.ctaUrgencyLevel,
                campaignCategory: v.analysis.campaignCategory,
                analysisConfidenceScore: v.analysis.analysisConfidenceScore
                    ? Number(v.analysis.analysisConfidenceScore)
                    : null,
                needsHumanReview: v.analysis.needsHumanReview,
            }
            : null,
    }));

    const table = useReactTable({
        data: videos,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
        manualPagination: true,
        pageCount: meta.totalPages,
    });

    const handleVideoClick = (video: VideoCardData) => {
        setSelectedVideo(video);
        setIsModalOpen(true);
    };

    const handleAnalyzeClick = (videoId: string, force: boolean = false) => {
        analyzeMutation.mutate({ videoId, force });
    };

    const handleDeleteClick = (videoId: string) => {
        if (confirm("Are you sure you want to delete this video? This action cannot be undone.")) {
            deleteMutation.mutate(videoId);
        }
    };

    const handleManualAnalysis = (videoId: string) => {
        setManualAnalysisVideoId(videoId);
        setIsManualModalOpen(true);
    };

    return (
        <div className="w-full space-y-4">
            {/* Filters & Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search videos..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8"
                        />
                    </div>

                    {/* Content Type Filter */}
                    <Select value={contentType} onValueChange={setContentType}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Content Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="product_demo">Product Demo</SelectItem>
                            <SelectItem value="lifestyle">Lifestyle</SelectItem>
                            <SelectItem value="unboxing">Unboxing</SelectItem>
                            <SelectItem value="testimonial">Testimonial</SelectItem>
                            <SelectItem value="tutorial">Tutorial</SelectItem>
                            <SelectItem value="trend_participation">Trend</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Sort */}
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest</SelectItem>
                            <SelectItem value="oldest">Oldest</SelectItem>
                            <SelectItem value="engagement">Engagement</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Mode Toggle */}
                    <div className="flex items-center border rounded-lg overflow-hidden">
                        <Button
                            variant={viewMode === "grid" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("grid")}
                            className="rounded-none"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === "table" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("table")}
                            className="rounded-none"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Column visibility (table view only) */}
                    {viewMode === "table" && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    Columns <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {table
                                    .getAllColumns()
                                    .filter((column) => column.getCanHide())
                                    .map((column) => {
                                        return (
                                            <DropdownMenuCheckboxItem
                                                key={column.id}
                                                className="capitalize"
                                                checked={column.getIsVisible()}
                                                onCheckedChange={(value) =>
                                                    column.toggleVisibility(!!value)
                                                }
                                            >
                                                {column.id}
                                            </DropdownMenuCheckboxItem>
                                        );
                                    })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            {/* Content */}
            {viewMode === "grid" ? (
                // Grid View
                <div>
                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="aspect-[9/16] bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : videoCards.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {videoCards.map((video) => (
                                <VideoCard
                                    key={video.id}
                                    video={video}
                                    onVideoClick={handleVideoClick}
                                    onAnalyzeClick={handleAnalyzeClick}
                                    onManualAnalyzeClick={handleManualAnalysis}
                                    onDeleteClick={handleDeleteClick}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No videos found. Upload one to get started.</p>
                        </div>
                    )}
                </div>
            ) : (
                // Table View
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-24 text-center">
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center"
                                    >
                                        No videos found. Upload one to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between py-4">
                <div className="text-sm text-muted-foreground">
                    {meta.total > 0 && (
                        <>
                            Showing {(page - 1) * limit + 1}-{Math.min(page * limit, meta.total)} of {meta.total} videos
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                        Page {page} of {meta.totalPages || 1}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(meta.totalPages || 1, p + 1))}
                        disabled={page >= (meta.totalPages || 1)}
                    >
                        Next
                    </Button>
                </div>
            </div>

            {/* Analysis Modal */}
            <VideoAnalysisModal
                video={selectedVideo}
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedVideo(null);
                }}
                onAnalyze={(videoId, force) => {
                    handleAnalyzeClick(videoId, force);
                    setIsModalOpen(false);
                    setSelectedVideo(null);
                }}
            />

            <ManualAnalysisModal
                videoId={manualAnalysisVideoId}
                isOpen={isManualModalOpen}
                onClose={() => {
                    setIsManualModalOpen(false);
                    setManualAnalysisVideoId(null);
                }}
                onSuccess={() => {
                    toast.success("Analysis added manually");
                    refetch(); // Refresh library
                }}
            />
        </div>
    );
}
