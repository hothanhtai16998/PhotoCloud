import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { getSiteTheme, setSiteTheme, subscribeSiteTheme } from '@/utils/siteTheme';
import './ThemeToggle.css';
export function ThemeToggle({ menu = false }: { menu?: boolean }) {
  const theme = useSyncExternalStore(subscribeSiteTheme, getSiteTheme, () => 'light');
  const dark = theme === 'dark';
  const label = dark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối';
  return <button type="button" className={`site-theme-toggle${menu ? ' site-theme-toggle-menu' : ''}`}
    aria-label={label} title={label} aria-pressed={dark} onClick={() => setSiteTheme(dark ? 'light' : 'dark')}>
    {dark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
    {menu && <span>{dark ? 'Chế độ sáng' : 'Chế độ tối'}</span>}
  </button>;
}
