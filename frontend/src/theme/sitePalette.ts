import defaults from '../../../shared/sitePalette.json';
export type PaletteTheme = 'light' | 'dark';
export type PaletteToken = keyof typeof defaults.light;
export type SitePalette = { version: 1; light: Record<PaletteToken,string>; dark: Record<PaletteToken,string> };
export const HEX_COLOR = /^#[a-f\d]{6}$/i;
export const PALETTE_CACHE_KEY = 'photocloud.sitePalette.v1';
export const paletteDefaults = defaults as SitePalette;
export function normalizePalette(value: unknown): SitePalette {
 const result = structuredClone(paletteDefaults);
 if (!value || typeof value !== 'object') return result;
 for (const theme of ['light','dark'] as const) {
  const colors = (value as Record<string,unknown>)[theme];
  if (!colors || typeof colors !== 'object') continue;
  for (const key of Object.keys(result[theme]) as PaletteToken[]) {
   const color = (colors as Record<string,unknown>)[key];
   if (typeof color === 'string' && HEX_COLOR.test(color)) result[theme][key] = color.toUpperCase();
  }
 }
 return result;
}
export function contrastRatio(a: string, b: string): number {
 if (!HEX_COLOR.test(a) || !HEX_COLOR.test(b)) return 0;
 const luminance = (hex: string): number => {
  const c = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255).map(n => n <= .04045 ? n/12.92 : ((n+.055)/1.055)**2.4);
  return c[0]*.2126+c[1]*.7152+c[2]*.0722;
 };
 const x=luminance(a),y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
export function hexHsl(hex: string): string {
 const [r,g,b] = [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255), max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2;
 const s=d===0?0:d/(1-Math.abs(2*l-1)); let h=0;
 if(d) h=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;
 return `${(h*60+360)%360} ${s*100}% ${l*100}%`;
}
export function paletteVariables(colors: Record<PaletteToken,string>): Record<string,string> {
 const aliases: Record<string,PaletteToken> = { '--background':'--bg-primary','--foreground':'--text-primary','--card':'--bg-card','--card-foreground':'--text-primary','--popover':'--bg-card','--popover-foreground':'--text-primary','--muted':'--bg-secondary','--muted-foreground':'--text-secondary','--secondary':'--bg-secondary','--secondary-foreground':'--text-primary','--border':'--border-color','--input':'--border-strong','--ring':'--button-focus','--primary':'--button-primary-bg','--primary-foreground':'--button-primary-fg','--success':'--status-success','--warning':'--status-warning','--destructive':'--status-error','--info':'--status-info' };
 const vars: Record<string,string> = {};
 for(const [key,color] of Object.entries(colors)) if(HEX_COLOR.test(color)) vars[key]=color;
 for(const [alias,key] of Object.entries(aliases)) if(HEX_COLOR.test(colors[key])) vars[alias]=hexHsl(colors[key]);
 return vars;
}
