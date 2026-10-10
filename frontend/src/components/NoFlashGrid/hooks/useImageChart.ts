import { useMemo } from 'react';
import type { Image } from '@/types/image';
import { chartConfig } from '@/config/chartConfig';

interface ChartDataPoint {
  date: Date;
  views: number;
  downloads: number;
  isBeforePublished: boolean;
}

interface UseImageChartReturn {
  chartData: ChartDataPoint[];
  maxViews: number;
  maxDownloads: number;
}

export const useImageChart = (image: Image): UseImageChartReturn => {
  const { chartData, maxViews, maxDownloads } = useMemo(() => {
    // Parse published date - backend stores dates in UTC
    const publishedDate = new Date(image.createdAt);

    // Get today's date in local timezone for chart display
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Helper to format date as YYYY-MM-DD using local timezone
    const formatDateLocal = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Helper to convert UTC date string (YYYY-MM-DD) to local date string
    // Backend stores dates in UTC, but we need to match them to local dates
    const convertUTCToLocalDateStr = (utcDateStr: string) => {
      // Parse UTC date string and convert to local date
      const utcDate = new Date(utcDateStr + 'T00:00:00.000Z');
      return formatDateLocal(utcDate);
    };

    // Convert UTC published date to local date for comparison
    const publishedLocalDate = new Date(
      publishedDate.getUTCFullYear(),
      publishedDate.getUTCMonth(),
      publishedDate.getUTCDate()
    );
    const publishedStr = formatDateLocal(publishedLocalDate);

    // Get daily views and downloads from image (backend stores in UTC date strings)
    const dailyViews = image.dailyViews || {};
    const dailyDownloads = image.dailyDownloads || {};

    // Check if we have any per-day data
    // An empty object {} means no per-day data exists (old images)
    const hasDailyViews = dailyViews && typeof dailyViews === 'object' && Object.keys(dailyViews).length > 0;
    const hasDailyDownloads = dailyDownloads && typeof dailyDownloads === 'object' && Object.keys(dailyDownloads).length > 0;

    // Calculate total tracked views/downloads and remaining untracked ones
    const totalTrackedViews = hasDailyViews
      ? Object.values(dailyViews).reduce((sum, count) => sum + (count || 0), 0)
      : 0;
    const totalTrackedDownloads = hasDailyDownloads
      ? Object.values(dailyDownloads).reduce((sum, count) => sum + (count || 0), 0)
      : 0;

    const remainingViews = Math.max(0, (image.views || 0) - totalTrackedViews);
    const remainingDownloads = Math.max(0, (image.downloads || 0) - totalTrackedDownloads);

    // Convert each daily bucket once instead of scanning all history for each bar.
    const indexDailyCounts = (counts: Record<string, number>) => {
      const indexed = new Map<string, number>();
      for (const [utcDate, count] of Object.entries(counts)) {
        const localDate = convertUTCToLocalDateStr(utcDate);
        indexed.set(localDate, (indexed.get(localDate) || 0) + count);
      }
      return indexed;
    };
    const indexedViews = indexDailyCounts(dailyViews);
    const indexedDownloads = indexDailyCounts(dailyDownloads);

    const { daysToDisplay, daysAgoOffset } = chartConfig;
    const data = Array.from({ length: daysToDisplay }, (_, i) => {
      // Calculate date: i=0 is daysAgoOffset days ago, i=daysAgoOffset is today (0 days ago)
      const daysAgo = daysAgoOffset - i;
      const date = new Date(today);
      date.setDate(today.getDate() - daysAgo);

      // Format chart date in local timezone
      const dateStr = formatDateLocal(date);
      const isBeforePublished = dateStr < publishedStr;

      let viewsValue = 0;
      let downloadsValue = 0;

      if (!isBeforePublished) viewsValue = indexedViews.get(dateStr) || 0;

      // Show remaining untracked views on published date (fallback for old views)
      // This handles views that happened before per-day tracking was implemented
      if (remainingViews > 0 && dateStr === publishedStr && !isBeforePublished) {
        viewsValue += remainingViews;
      }

      if (!isBeforePublished) downloadsValue = indexedDownloads.get(dateStr) || 0;

      // Show remaining untracked downloads on published date (fallback for old downloads)
      if (remainingDownloads > 0 && dateStr === publishedStr && !isBeforePublished) {
        downloadsValue += remainingDownloads;
      }

      return {
        date,
        views: viewsValue,
        downloads: downloadsValue,
        isBeforePublished,
      };
    });

    // Calculate max values once
    const maxViews = Math.max(...data.map(d => d.views), 1);
    const maxDownloads = Math.max(...data.map(d => d.downloads), 1);

    return { chartData: data, maxViews, maxDownloads };
  }, [image.createdAt, image.dailyViews, image.dailyDownloads, image.views, image.downloads]);

  return { chartData, maxViews, maxDownloads };
};

