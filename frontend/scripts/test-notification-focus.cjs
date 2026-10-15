const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.setContent(`<button id="start">Start</button><header class="PHOTOCLOUD-header" style="position:fixed;top:12px;right:16px;left:auto;width:auto"><div class="notification-bell-wrapper"><button class="notification-bell-btn" aria-label="Thông báo">Bell</button><div class="notification-dropdown"><div class="notification-dropdown-header"><h3>Thông báo</h3><div class="notification-dropdown-actions"><button class="notification-action-btn" aria-label="Đóng">×</button></div></div><div class="notification-dropdown-content"><div class="notification-item"><div class="notification-item-icon">↪</div><div class="notification-item-content"><p class="notification-item-message">Đăng nhập từ Chrome (127.0.0.1)</p><span class="notification-item-time">2 ngày trước</span></div></div><div class="notification-item unread"><div class="notification-item-icon">♧</div><div class="notification-item-content"><p class="notification-item-message">Bạn có thông báo mới</p><span class="notification-item-time">2 ngày trước</span></div></div></div></div></div></header>`);
      for (const file of ['styles/theme.css', 'components/Header.css', 'components/ImmersiveHomeChrome.css']) {
        await page.addStyleTag({content:fs.readFileSync(path.resolve(__dirname, '../src', file), 'utf8')});
      }
      await page.addStyleTag({ content: fs.readFileSync(path.resolve(__dirname, '../src/components/NotificationBell.css'), 'utf8') });
      const button = page.locator('.notification-bell-btn');
      for (const theme of ['light', 'dark', 'slideshow']) {
        await page.evaluate(theme => {
          document.documentElement.classList.toggle('dark-theme', theme !== 'light');
          document.body.classList.toggle('home-cinematic-active', theme === 'slideshow');
          document.body.style.background = theme === 'light' ? '#fff' : '#16140f';
          document.querySelector('#start').focus();
        }, theme);
        await page.keyboard.press('Tab');
        await button.hover();
        await page.waitForTimeout(250);
        const focus = await button.evaluate(element => ({
          visible: element.matches(':focus-visible'),
          style: getComputedStyle(element).outlineStyle,
          width: getComputedStyle(element).outlineWidth,
          color: getComputedStyle(element).outlineColor,
        }));
        assert.equal(focus.visible, true);
        assert.equal(focus.style, 'solid');
        assert.equal(focus.width, '3px');
        assert.equal(focus.color, 'rgb(22, 102, 92)');
        const palette = await page.locator('.notification-item-time').first().evaluate(element => ({text:getComputedStyle(element).color,bg:getComputedStyle(element.closest('.notification-dropdown')).backgroundColor}));
        const luminance = color => color.match(/\d+/g).slice(0,3).map(Number).map(value => { const c=value/255; return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4; }).reduce((sum,c,i)=>sum+c*[0.2126,0.7152,0.0722][i],0);
        const a=luminance(palette.text),b=luminance(palette.bg);
        assert.ok((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)>=4.5, 'Timestamp contrast');
        await page.screenshot({path:path.resolve(__dirname, `../notification-${theme}-${width}.png`)});
        console.log(JSON.stringify({ viewportWidth: width, theme, ...focus }));
      }
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
