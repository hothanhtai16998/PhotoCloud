import fs from 'node:fs';
import { LoadingIndicatorFrame } from './src/components/ui/LoadingIndicatorFrame';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Plugin } from 'vite';
import { HEADER_BRAND, HEADER_LINKS } from './src/config/publicHeader';
import { AccountHeaderFrame } from './src/components/AccountHeaderFrame';
import { PublicHeaderActions } from './src/components/PublicHeaderActions';
import { CollectionDetailSkeleton } from './src/pages/collection/components/CollectionDetailFrame';
import { ExploreStartup } from './src/pages/explore/ExploreToolbar';
import { readExploreCategories } from './src/pages/explore/categorySnapshot';
import { CollectionsToolbar } from './src/components/collection/CollectionsToolbar';
import { PackagesStartup } from './src/pages/packages/PackagesFrame';
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
  const memberActions = renderToStaticMarkup(createElement(AccountHeaderFrame));
  const adminActions = renderToStaticMarkup(createElement(AccountHeaderFrame, { admin: true }));
  const toolbar = renderToStaticMarkup(createElement(CollectionsToolbar, { labels: copy, isInitializing: true, canCreate: true, createPending: true }));
  return `<div id="public-header-startup" class="public-header-startup" data-header-frame aria-hidden="true" inert><div class="header-top"><div class="header-container"><div class="header-logo-container"><a class="header-logo" href="/"><span class="text-logo">${escapeHtml(HEADER_BRAND.text)}</span></a></div><nav class="header-studio-nav">${links}</nav><div class="header-actions desktop-only"><div data-startup-actions="guest">${actions}</div><div data-startup-actions="member">${memberActions}</div><div data-startup-actions="admin">${adminActions}</div></div></div></div></div><div id="public-collections-startup" class="public-collections-startup app-body" aria-hidden="true" inert><div class="collections-page" data-loading-scope="local"><div class="collections-page-shell">${toolbar}</div></div></div>`;
}

// Build-time public chrome only; auth and collection data remain runtime-owned.
export function publicHeaderStartup(): Plugin {
  return {
    name: 'public-header-startup',
    transformIndexHtml: {
      order: 'pre',
      handler(html): string {
        const css = ['./src/components/ui/LoadingIndicator.css', './src/components/user/DataLoading.css', './src/pages/ExplorePage.css', './src/components/HeaderFrame.css', './src/components/PublicHeaderActions.css', './src/components/collection/CollectionsToolbar.css', './src/pages/collection/components/CollectionDetailFrame.css', './src/pages/PackagesPage.css', './src/styles/public-content-layout.css'].map(file => fs.readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8').replace(/^@import .*public-content-layout\.css.*;\r?\n/gm, '')).join('\n');
        const palette = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../shared/sitePalette.json', import.meta.url)), 'utf8')) as unknown;
        const detail = renderToStaticMarkup(createElement(CollectionDetailSkeleton));
        const explore = renderToStaticMarkup(createElement(ExploreStartup));
        const packages = renderToStaticMarkup(createElement(PackagesStartup));
        const markup = startupMarkup('vi') + `<template id="public-startup-en">${startupMarkup('en')}</template><div id="public-collection-detail-startup" class="public-collection-detail-startup app-body" aria-hidden="true" inert>${detail}</div><div id="public-explore-startup" class="public-explore-startup app-body" aria-hidden="true" inert>${explore}</div><div id="public-packages-startup" class="public-packages-startup app-body" aria-hidden="true" inert>${packages}</div>`;
        // Run before the generated stylesheet link: a body script would wait for CSS
        // and could paint the empty category row while a cached list already exists.
        const restoreCategories = `<script>(()=>{
          if(document.documentElement.dataset.startupSurface!=='explore')return;
          const observer=new MutationObserver(()=>{
          const group=document.querySelector('#public-explore-startup .explore-categories');
          if(group?.firstElementChild) {
            observer.disconnect();
            const categories=(${readExploreCategories.toString()})();
            for(const category of categories) {
              const button=group.firstElementChild.cloneNode(false);
              button.classList.remove('is-active');button.setAttribute('aria-pressed','false');
              button.textContent=category.translated;
              if(category.imageCount>0){const count=document.createElement('span');count.className='explore-chip-count';count.textContent=String(category.imageCount);button.append(count);}
              group.append(button);
            }
          }
          });
          observer.observe(document.documentElement,{childList:true,subtree:true});
          window.addEventListener('DOMContentLoaded',()=>observer.disconnect(),{once:true});
        })();</script>`;
        const activate = `<script>(()=>{
          if(document.documentElement.dataset.publicLocale==='en'){
            const template=document.getElementById('public-startup-en');
            document.getElementById('public-header-startup').remove();
            document.getElementById('public-collections-startup').replaceWith(template.content.cloneNode(true));
          }
          document.getElementById('public-startup-en').remove();
          const shell=document.getElementById('public-header-startup');
          for(const link of shell.querySelectorAll('a[data-exact]')){
            const href=link.getAttribute('href');
            if(link.dataset.exact==='true'?location.pathname===href:location.pathname===href||location.pathname.startsWith(href+'/'))link.setAttribute('aria-current','page');
          }
        })();</script>`;
        return html.replace('<!-- startup-loading -->', `<div id="startup-loading">${renderToStaticMarkup(createElement(LoadingIndicatorFrame, { size: 'large' }))}</div>`).replace('/* public-palette-defaults */ {}', JSON.stringify(palette)).replace('<!-- public-header-critical -->', `${restoreCategories}<style id="public-header-critical">${css}</style>`).replace('<!-- public-header-startup -->', markup).replace('<!-- public-header-activate -->', activate);
      },
    },
  };
}
