import { appConfig } from '@/config/appConfig';

export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= appConfig.mobileBreakpoint;
}

export function isDesktopViewport(): boolean {
  if (typeof window === 'undefined') return true;
  return window.innerWidth > appConfig.mobileBreakpoint;
}

export function currentBreakpoint(): keyof typeof appConfig.breakpoints {
  if (typeof window === 'undefined') return 'xl';
  const w = window.innerWidth;
  const { xs, sm, md, lg, xl } = appConfig.breakpoints;
  if (w <= xs) return 'xs';
  if (w <= sm) return 'sm';
  if (w <= md) return 'md';
  if (w <= lg) return 'lg';
  if (w <= xl) return 'xl';
  return 'xxl';
}
