const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const baseline = process.argv.includes('--baseline');
const root = path.resolve(__dirname, '..');
const css = ['components/booking/HeroBooking.css', 'components/HeaderMarquee.css']
  .map(file => fs.readFileSync(path.join(root, 'src', file), 'utf8')).join('\n');
const matrix = [[320,568],[390,844],[440,956],[768,1024],[1024,768],[1440,900],[844,390],[900,650],[901,650]];
const results = [];

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    for (const [width, height] of matrix) {
      const page = await browser.newPage({viewport: {width, height}, reducedMotion: 'reduce'});
      try {
        // Isolated geometry fixture: real CSS, no API calls or application navigation.
        await page.setContent(`<style>
          *{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}
          :root{--homepage-header-height:80px;--studio-bg-warm:#FAF8F4;--studio-bg-cream:#F2EEE7;--studio-text-primary:#1B1B19;--studio-font-display:Georgia,serif;--studio-accent-copper:#B8865B;--studio-rating-gold-bright:#D9A441}
          ${css}
          </style><section class="hero-section">
          <div class="hero-marquee-wrap"><div class="header-marquee"><div class="header-marquee-track">${'<span>PHOTOCLOUD STUDIO — ĐANG NHẬN YÊU CẦU ĐẶT LỊCH</span>'.repeat(8)}</div></div></div>
          <div class="hero-copy"><div class="hero-eyebrow-wrap"><span class="hero-eyebrow">PHOTOCLOUD STUDIO</span></div>
          <h1 class="hero-title"><span class="hero-title-line">Chụp ảnh</span><span class="hero-title-line"><em>theo cách của bạn</em></span></h1>
          <p class="hero-sub">Studio nhận chụp chân dung, couple, gia đình, mini session và doanh nghiệp — đặt lịch online, nhận ảnh đã chỉnh màu.</p>
          <ul class="hero-highlights"><li class="hero-highlight">Chọn gói chụp phù hợp với bạn</li></ul>
          <div class="hero-actions"><button class="hero-cta hero-cta--primary">Đặt lịch chụp ngay</button><button class="hero-cta hero-cta--secondary">Xem gói chụp</button></div></div>
          <div class="hero-visual"><div class="hero-visual-heading">BỘ SƯU TẬP NỔI BẬT</div><div class="hero-grid">${Array.from({length:4},(_,i)=>`<a href="#" class="hero-collection"><span class="hero-collection-label"><span class="hero-collection-label-index">0${i+1}</span><span class="hero-collection-label-name">Bộ sưu tập có tên dài để kiểm tra bố cục</span></span><div class="hero-collection-card"></div></a>`).join('')}</div></div></section>`);
        const result = await page.evaluate(() => {
          const rect = selector => {
            const r = document.querySelector(selector).getBoundingClientRect();
            return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
          };
          const hero = rect('.hero-section');
          const targets = ['.hero-copy','.hero-sub','.hero-title','.hero-actions','.hero-visual','.hero-grid'];
          const clipped = targets.filter(s => { const r = rect(s); return r.right > hero.right + 1 || r.left < hero.left - 1 || r.bottom > hero.bottom + 1; });
          const buttons = [...document.querySelectorAll('.hero-cta')].map(e=>({width:e.clientWidth,scrollWidth:e.scrollWidth}));
          const cards = [...document.querySelectorAll('.hero-collection-card')].map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));
          return {viewport:innerWidth,hero,copy:rect('.hero-copy'),clipped,buttons,cards,bodyOverflow:document.documentElement.scrollWidth>innerWidth};
        });
        results.push({width,height,...result});
        if (!baseline) {
          assert.deepEqual(result.clipped, [], `clipping at ${width}x${height}`);
          assert.equal(result.bodyOverflow, false);
          assert.ok(result.buttons.every(b=>b.scrollWidth<=b.width+1), `button overflow at ${width}`);
          if(width<=900) assert.ok(result.cards.every(c=>c.width>0 && Math.abs(c.width/c.height-4/3)<0.02),'Card ratio');
          if ([390,1440].includes(width)) await page.screenshot({path:path.join(root,`hero-responsive-${width}.png`),fullPage:true});
        }
      } finally { await page.close(); }
    }
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(root, baseline ? 'hero-responsive-baseline.json' : 'hero-responsive-after.json'), JSON.stringify(results,null,2));
    console.log(JSON.stringify(results.map(r=>({width:r.width,height:r.height,copy:r.copy.width,clipped:r.clipped,buttons:r.buttons})),null,2));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
