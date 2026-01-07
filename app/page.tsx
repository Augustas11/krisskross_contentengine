import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LayoutDashboard, Upload, Library, TrendingUp, Users, Video as VideoIcon, AlertCircle } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TikTokConnectButton } from "@/components/auth/TikTokConnectButton";

export const dynamic = 'force-dynamic'; // Ensure real-time data

export default async function Home() {
  const session = await getServerSession(authOptions);

  // Check if user has a TikTok account linked
  let isTikTokConnected = false;
  if (session?.user?.email) {
    // @ts-ignore - Prisma type generation fallback
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { accounts: true }
    });
    isTikTokConnected = user?.accounts.some((acc: any) => acc.provider === 'tiktok') || false;
  }

  const [
    videoCount,
    metricStats,
    videosMissingTags,
    recentVideos,
    activeInsights,
    bestPractices
  ] = await Promise.all([
    prisma.video.count(),
    prisma.tikTokMetric.aggregate({
      _sum: { views: true },
      _avg: { engagementRate: true }
    }),
    prisma.video.count({
      where: {
        OR: [
          { campaignTag: null },
          { campaignTag: "" }
        ]
      }
    }),
    prisma.video.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.insight.findMany({
      where: { status: 'active' },
      orderBy: { confidenceScore: 'desc' },
      take: 3
    }),
    prisma.bestPractice.findMany({
      orderBy: { performanceAvg: 'desc' },
      take: 3
    })
  ]);

  const totalViews = metricStats._sum.views || 0;
  const avgEngagement = metricStats._avg.engagementRate
    ? Number(metricStats._avg.engagementRate).toFixed(1)
    : "0.0";

  return (
    <div className="container mx-auto py-10 max-w-7xl">
      <div className="flex flex-col space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your content performance and assets.</p>
      </div>

      {!isTikTokConnected && (
        <div className="mb-8 p-4 border border-amber-200 bg-amber-50 rounded-lg flex items-center justify-between dark:bg-amber-950/30 dark:border-amber-900 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            <div>
              <h3 className="font-medium text-amber-900 dark:text-amber-200">Connect TikTok Account</h3>
              <p className="text-sm text-amber-700 dark:text-amber-400">Link your account to sync video metrics and access insights.</p>
            </div>
          </div>
          <TikTokConnectButton />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <VideoIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{videoCount}</div>
            <p className="text-xs text-muted-foreground">in library</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">lifetime views</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgEngagement}%</div>
            <p className="text-xs text-muted-foreground">average rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action Required</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{videosMissingTags}</div>
            <p className="text-xs text-muted-foreground">Videos missing campaign tags</p>
          </CardContent>
        </Card>
      </div>

      {/* Intelligence Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mb-8">
        <Card className="col-span-4 border-indigo-100 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Content Intelligence
            </CardTitle>
            <CardDescription>AI-driven insights from your video performance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeInsights.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No insights yet. Connect TikTok and wait for the sync job to analyze enough data.
              </p>
            ) : (
              activeInsights.map(insight => (
                <div key={insight.id} className="p-3 bg-white dark:bg-slate-950 rounded-md border shadow-sm">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{insight.insightText}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full capitalize">
                      {insight.category?.replace('_', ' ')}
                    </span>
                    <span>Confidence: {Number(insight.confidenceScore).toFixed(0)}%</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Top Performing Videos</CardTitle>
            <CardDescription>Best practices based on data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {bestPractices.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No top performers identified yet.
              </div>
            ) : (
              bestPractices.map(bp => (
                <div key={bp.id} className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-xs shrink-0">
                    ★
                  </div>
                  <div>
                    <p className="text-sm font-medium">{bp.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(Number(bp.performanceAvg) || 0).toFixed(1)}% Engagement Rate
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Link href="/upload">
              <Button className="w-full h-24 text-lg flex flex-col gap-2" variant="outline">
                <Upload className="h-6 w-6" />
                Upload New Video
              </Button>
            </Link>
            <Link href="/library">
              <Button className="w-full h-24 text-lg flex flex-col gap-2" variant="outline">
                <Library className="h-6 w-6" />
                Manage Library
              </Button>
            </Link>
            <Link href="/api/cron/sync-tiktok" target="_blank">
              <Button className="w-full h-24 text-lg flex flex-col gap-2 bg-muted/50 hover:bg-muted" variant="outline">
                <TrendingUp className="h-6 w-6" />
                Trigger Sync Job
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest uploads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentVideos.length === 0 ? (
                <p className="text-sm text-muted-foreground">No videos uploaded yet.</p>
              ) : (
                recentVideos.map((video) => (
                  <div key={video.id} className="flex items-center">
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none truncate max-w-[200px]">
                        {video.filename || "Untitled Video"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {video.contentType || "Unknown Type"} • {formatDistanceToNow(new Date(video.uploadDate), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
