import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useImageChart } from './hooks/useImageChart';
import type { Image } from '@/types/image';
import { t } from '@/i18n';

interface ImageModalChartProps {
  image: Image;
  activeTab: 'views' | 'downloads';
}

export const ImageModalChart = ({ image, activeTab }: ImageModalChartProps) => {
  const { chartData, maxViews, maxDownloads } = useImageChart(image);
  const [hoveredBar, setHoveredBar] = useState<{ date: string; views: number; downloads: number; x: number; y: number } | null>(null);
  const mouseMoveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (mouseMoveTimeoutRef.current) {
        clearTimeout(mouseMoveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="info-chart-container"
      ref={chartContainerRef}
      onMouseMove={(e) => {
        // Throttle mouse move handler to improve performance
        if (mouseMoveTimeoutRef.current) {
          return;
        }

        mouseMoveTimeoutRef.current = setTimeout(() => {
          mouseMoveTimeoutRef.current = null;

          if (!chartContainerRef.current) return;

          const chartInner = chartContainerRef.current.querySelector('.info-chart') as HTMLElement;
          if (!chartInner) return;

          // Get all bar elements to find exact positions
          const bars = Array.from(chartInner.querySelectorAll('.info-chart-bar'));
          if (bars.length === 0) return;

          const chartInnerRect = chartInner.getBoundingClientRect();

          // Find which bar the mouse is closest to horizontally
          let hoveredBarIndex = -1;
          let minDistance = Infinity;
          let barCenterX = 0;
          let barTopY = 0;

          bars.forEach((bar, index) => {
            const barRect = bar.getBoundingClientRect();
            const barCenter = barRect.left + (barRect.width / 2);
            const distance = Math.abs(e.clientX - barCenter);

            // Also check if mouse is within the chart area vertically
            if (e.clientY >= chartInnerRect.top && e.clientY <= chartInnerRect.bottom) {
              if (distance < minDistance) {
                minDistance = distance;
                hoveredBarIndex = index;
                barCenterX = barCenter;
                // Get the top of the bar (where the tooltip should appear)
                barTopY = barRect.top;
              }
            }
          });

          if (hoveredBarIndex >= 0 && hoveredBarIndex < chartData.length) {
            const data = chartData[hoveredBarIndex];
            if (!data) return;
            // Format date in local timezone - use simple formatting to avoid UTC label
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const dateStr = `${monthNames[data.date.getMonth()]} ${data.date.getDate()}, ${data.date.getFullYear()}`;

            // Ensure tooltip stays within viewport
            const tooltipWidth = 200;
            const margin = 10;
            let finalX = barCenterX;

            // Adjust if too far right
            if (finalX + (tooltipWidth / 2) > window.innerWidth - margin) {
              finalX = window.innerWidth - (tooltipWidth / 2) - margin;
            }

            // Adjust if too far left
            if (finalX - (tooltipWidth / 2) < margin) {
              finalX = (tooltipWidth / 2) + margin;
            }

            if (data) {
              setHoveredBar({
                date: dateStr,
                views: data.views,
                downloads: data.downloads,
                x: finalX,
                y: barTopY - 8
              });
            }
          } else {
            setHoveredBar(null);
          }
        }, 16); // ~60fps throttling
      }}
      onMouseLeave={() => {
        if (mouseMoveTimeoutRef.current) {
          clearTimeout(mouseMoveTimeoutRef.current);
          mouseMoveTimeoutRef.current = null;
        }
        setHoveredBar(null);
      }}
    >
      <div className="info-chart">
        {chartData.map((data, i) => {
          const value = activeTab === 'views' ? data.views : data.downloads;
          const maxValue = activeTab === 'views' ? maxViews : maxDownloads;
          const height = maxValue > 0 ? (value / maxValue) * 100 : 0;

          return (
            <div
              key={i}
              className={`info-chart-bar ${data.isBeforePublished ? 'before-published' : ''}`}
              style={{ height: `${Math.max(height, 2)}%` }}
            />
          );
        })}
      </div>
      {hoveredBar && typeof document !== 'undefined' && createPortal(
        <div
          className="info-chart-tooltip"
          style={{
            position: 'fixed',
            left: `${hoveredBar.x}px`,
            top: `${hoveredBar.y}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 10000
          }}
        >
          <div>{hoveredBar.date}</div>
          {activeTab === 'views' ? (
            <div>{t('image.viewedTimes', { value: hoveredBar.views.toLocaleString() })}</div>
          ) : (
            <div>{t('image.downloadedTimes', { value: hoveredBar.downloads.toLocaleString() })}</div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

