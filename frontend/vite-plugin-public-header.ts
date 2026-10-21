import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Plugin } from 'vite';
import { HEADER_BRAND, HEADER_LINKS } from './src/config/publicHeader';
import { PublicHeaderActions } from './src/components/PublicHeaderActions';
import { CollectionsToolbar } from './src/components/collection/CollectionsToolbar';
import { gallery as viGallery } from './src/i18n/locales/vi/gallery';
import { gallery as enGallery } from './src/i18n/locales/en/gallery';
import { account as viAccount } from './src/i18n/locales/vi/account';
import { account as enAccount } from './src/i18n/locales/en/account';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

function startupMarkup(locale: 'vi' | 'en'): string {
  const copy = locale === 'en' ? enGallery.collections : viGallery.collections;
  const account = locale === 'en' ? enAccount : viAccount;
  const links = HEADER_LINKS.map(link => `<a href="${escapeHtml(link.href)}" data-exact="${link.exact}">${escapeHtml(link.label)}</a>`).join('');
  const actions = renderToStaticMarkup(createElement(PublicHeaderActions, { signInLabel: account.auth.signIn }));
  const toolbar = renderToStaticMarkup(createElement(CollectionsToolbar, { labels: copy, isInitializing: true }));
  return `<div id="public-header-startup" class="public-header-startup" data-header-frame aria-hidden="true" inert><div class="header-top"><div class="header-container"><div class="header-logo-container"><a class="header-logo" href="/"><span class="text-logo">${escapeHtml(HEADER_BRAND.text)}</span></a></div><nav class="header-studio-nav">${links}</nav><div class="header-actions desktop-only">${actions}</div></div></div></div><div id="public-collections-startup" class="public-collections-startup app-body" aria-hidden="true" inert><div class="collections-page" data-loading-scope="local"><div class="collections-page-shell">${toolbar}</div></div></div>`;
}

// Build-time public chrome only; auth and collection data remain runtime-owned.
export function publicHeaderStartup(): Plugin {
  return {
    name: 'public-header-startup',
    transformIndexHtml: {
      order: 'pre',
      handler(html): string {
        const css = ['./src/components/HeaderFrame.css', './src/components/PublicHeaderActions.css', './src/components/collection/CollectionsToolbar.css'].map(file => fs.readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8')).join('\n');
        const palette = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../shared/sitePalette.json', import.meta.url)), 'utf8')) as unknown;
        const markup = startupMarkup('vi') + `<template id="public-startup-en">${startupMarkup('en')}</template>`;
        const activate = `<script>(()=>{
          if(document.documentElement.dataset.publicLocale==='en'){
            const template=document.getElementById('public-startup-en');
            document.getElementById('public-header-startup').remove();
            document.getElementById('public-collections-startup').replaceWith(template.content.cloneNode(true));
          }
          document.getElementById('public-startup-en').remove();
          const shell=document.getElementById('public-header-startup');
          if(document.documentElement.dataset.publicAuth==='guest')shell.querySelector('.public-guest-actions').dataset.authPending='false';
          for(const link of shell.querySelectorAll('a[data-exact]')){
            const href=link.getAttribute('href');
            if(link.dataset.exact==='true'?location.pathname===href:location.pathname===href||location.pathname.startsWith(href+'/'))link.setAttribute('aria-current','page');
          }
        })();</script>`;
        return html.replace('/* public-palette-defaults */ {}', JSON.stringify(palette)).replace('<!-- public-header-critical -->', `<style id="public-header-critical">${css}</style>`).replace('<!-- public-header-startup -->', markup).replace('<!-- public-header-activate -->', activate);
      },
    },
  };
}
