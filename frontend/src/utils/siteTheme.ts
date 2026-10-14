export type SiteTheme = 'light' | 'dark';
export function getSiteTheme(): SiteTheme {
  return document.documentElement.classList.contains('dark-theme') ? 'dark' : 'light';
}
export function setSiteTheme(theme: SiteTheme, persist = true): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('dark-theme', theme === 'dark');
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#16140F' : '#FAF8F4');
  if (persist) { try { localStorage.setItem('theme', theme); } catch { /* Theme still works without storage. */ } }
  window.dispatchEvent(new Event('photocloud-theme-change'));
}
export function subscribeSiteTheme(listener: () => void): () => void {
  const storage = (event: StorageEvent): void => {
    if (event.key === 'theme') setSiteTheme(event.newValue === 'dark' ? 'dark' : 'light', false);
  };
  window.addEventListener('photocloud-theme-change', listener);
  window.addEventListener('storage', storage);
  return () => {
    window.removeEventListener('photocloud-theme-change', listener);
    window.removeEventListener('storage', storage);
  };
}
