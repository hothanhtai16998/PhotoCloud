import { normalizePalette, paletteVariables, PALETTE_CACHE_KEY, type SitePalette } from './sitePalette';
let revision = 0;
export const getPaletteRevision = (): number => revision;
function variables(values: Record<string,string>): string { return Object.entries(values).map(([key,value])=>`${key}:${value}`).join(';'); }
export function applySitePalette(value: unknown, cache = true): SitePalette {
 const palette = normalizePalette(value);
 const css = (['light','dark'] as const).map(theme => {
  const selector = theme === 'light' ? 'html[data-site-palette]:not(.dark-theme)' : 'html[data-site-palette].dark-theme';
  const colors = palette[theme], vars = variables(paletteVariables(colors));
  const admin = variables({ '--admin-bg':colors['--bg-primary'],'--admin-card-bg':colors['--bg-card'],'--admin-text':colors['--text-primary'],'--admin-text-secondary':colors['--text-secondary'],'--admin-border':colors['--border-color'],'--admin-hover':colors['--hover-bg'],'--admin-accent':colors['--button-primary-bg'],'--admin-danger':colors['--button-danger-text'] });
  return `${selector}{${vars}}${selector} body{${vars}}${selector} .admin-layout,${selector} .admin-tools,${selector} .admin-modal{${admin}}`;
 }).join('\n');
 let style = document.getElementById('site-palette') as HTMLStyleElement | null;
 if (!style) { style=document.createElement('style');style.id='site-palette';document.head.append(style); }
 if (style.textContent !== css) { style.textContent=css; revision++; }
 document.documentElement.dataset.sitePalette='1';
 if(cache) try { localStorage.setItem(PALETTE_CACHE_KEY,JSON.stringify(palette)); } catch { /* Storage is optional. */ }
 return palette;
}
export function restoreCachedPalette(): void {
 try { const stored=localStorage.getItem(PALETTE_CACHE_KEY); if(stored) applySitePalette(JSON.parse(stored),false); } catch { /* Defaults remain visible if cache is unavailable or malformed. */ }
}
