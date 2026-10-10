import { useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { useImageChart } from '../hooks/useImageChart';
import type { Image } from '@/types/image';
import { t, getLocale } from '@/i18n';

interface ImageModalChartProps { image: Image; activeTab: 'views' | 'downloads' }

export const ImageModalChart = memo(({ image, activeTab }: ImageModalChartProps) => {
  const { chartData, maxViews, maxDownloads } = useImageChart(image);
  const [hovered, setHovered] = useState<{ index: number; x: number; y: number; below: boolean } | null>(null);
  const showingTooltip = hovered !== null;
  useEffect(() => {
    if (!showingTooltip) return;
    const hide = () => setHovered(null);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [showingTooltip]);
  const show = (index: number, bar: HTMLElement) => {
    const rect = bar.getBoundingClientRect();
    const margin = 12;
    const halfWidth = Math.min(120, (window.innerWidth - margin * 2) / 2);
    setHovered({ index, x: Math.max(halfWidth + margin, Math.min(rect.left + rect.width / 2, window.innerWidth - halfWidth - margin)),
      y: rect.top < 90 ? rect.bottom + 8 : rect.top - 8, below: rect.top < 90 });
  };
  const dateLabel = (date: Date) => date.toLocaleDateString(getLocale(), { year: 'numeric', month: 'short', day: 'numeric' });
  const valueLabel = (value: number) => t(activeTab === 'views' ? 'image.viewedTimes' : 'image.downloadedTimes', { value: value.toLocaleString(getLocale()) });
  const point = hovered && chartData[hovered.index];

  return <div className="info-chart-container">
    <div className="info-chart" aria-label={t(activeTab === 'views' ? 'image.views' : 'image.downloads')}>
      {chartData.map((data, index) => {
        const value = activeTab === 'views' ? data.views : data.downloads;
        const max = activeTab === 'views' ? maxViews : maxDownloads;
        return <button key={data.date.getTime()} type="button"
          className={`info-chart-bar ${data.isBeforePublished ? 'before-published' : ''}`}
          data-empty={value === 0 ? 'true' : undefined}
          style={{ height: `${Math.max(max > 0 ? value / max * 100 : 0, 2)}%` }}
          aria-label={`${dateLabel(data.date)}: ${valueLabel(value)}`}
          onPointerEnter={event => show(index, event.currentTarget)}
          onPointerLeave={() => setHovered(null)}
          onFocus={event => show(index, event.currentTarget)} onBlur={() => setHovered(null)} />;
      })}
    </div>
    {hovered && point && createPortal(<div className="info-chart-tooltip" aria-hidden="true"
      style={{ left: hovered.x, top: hovered.y, transform: hovered.below ? 'translate(-50%, 0)' : 'translate(-50%, -100%)' }}>
      <div>{dateLabel(point.date)}</div><div>{valueLabel(activeTab === 'views' ? point.views : point.downloads)}</div>
    </div>, document.body)}
  </div>;
});
ImageModalChart.displayName = 'ImageModalChart';
