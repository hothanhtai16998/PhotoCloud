const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    for (const width of [320,390,768,1024,1440]) {
      const page = await browser.newPage({viewport:{width,height:900}});
      await page.setContent(`<header class="PHOTOCLOUD-header"><div class="mobile-header-actions"><button class="header-library-action">♥</button><button class="mobile-header-icon">↓</button><button class="mobile-hamburger-button">≡</button><div class="mobile-header-icon-wrapper"><button class="notification-bell-btn">♧</button></div></div></header><main class="travel-stage"><div class="destination-actions"><button class="bookmark">B</button><button class="discover">Pause</button></div><footer class="slider-controls"><button>←</button><button>→</button><button>Ⅱ</button></footer></main><section class="booking-modal"><button class="booking-modal-close">×</button><footer class="booking-modal-footer"><button>Back</button><button>Next</button></footer><div class="booking-modal-success"><button>Done</button></div></section>`);
      for (const file of ['Header.css','NotificationBell.css','TimedCardSlider.css','BookingModal.css']) {
        await page.addStyleTag({content:fs.readFileSync(path.resolve(__dirname,'../src/components',file),'utf8')});
      }
      await page.waitForTimeout(350);
      await page.evaluate(() => {
        const modal = document.querySelector('.booking-modal');
        const packages = document.createElement('div');
        packages.className = 'booking-modal-packages';
        packages.innerHTML = ['Chân dung cá nhân','Mini session','Couple'].map(name => `<button><span class="booking-package-thumb"></span><strong>${name}</strong><span>1.500.000 ₫</span><small>60 phút · 20 ảnh</small></button>`).join('');
        modal.prepend(packages);
      });
      if (width<=600) {
        const rows = await page.locator('.booking-modal-packages button').evaluateAll(elements => elements.map(element => {
          const row=element.getBoundingClientRect(), thumb=element.querySelector('.booking-package-thumb').getBoundingClientRect(), title=element.querySelector('strong').getBoundingClientRect();
          return {height:row.height,thumbRight:thumb.right,titleLeft:title.left};
        }));
        for (const row of rows) {assert.ok(row.height<=100,'Package row should be compact');assert.ok(row.thumbRight<row.titleLeft,'Thumbnail must stay left of text');}
        await page.locator('.booking-modal').screenshot({path:path.resolve(__dirname,`../booking-compact-${width}.png`)});
      }
      const buttons = await page.locator('button').evaluateAll(elements => elements.filter(element => getComputedStyle(element).display !== 'none' && element.getClientRects().length).map(element => ({name:element.className || element.textContent,width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height})));
      for (const button of buttons) assert.ok(button.width>=44 && button.height>=44,`${width}: ${JSON.stringify(button)}`);
      const controls = await page.locator('.slider-controls button').evaluateAll(elements => elements.filter(element => getComputedStyle(element).display !== 'none').map(element => {const box=element.getBoundingClientRect();return {left:box.left,right:box.right};}));
      for (let index=1;index<controls.length;index++) assert.ok(controls[index].left>=controls[index-1].right,'Slider buttons must not overlap');
      console.log(`PASS ${width}: ${buttons.length} visible targets >=44px, slider controls do not overlap`);
      await page.close();
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
