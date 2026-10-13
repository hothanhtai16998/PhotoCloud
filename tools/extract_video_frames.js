const { chromium } = require('playwright');
const fs = require('fs');

const videoPath = 'C:/Users/Fenn/AppData/Local/Packages/Microsoft.ScreenSketch_8wekyb3d8bbwe/TempState/Recordings/20261013-0220-33.0492419.mp4';
const outDir = 'C:/Users/Fenn/Desktop/PhotoCloud/video_frames';

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.setContent(`
    <html>
      <body style="margin:0;background:#111;display:grid;place-items:center;width:100vw;height:100vh;overflow:hidden">
        <video id="v" src="file:///${videoPath}" style="width:100vw;height:100vh;object-fit:contain;background:#111"></video>
      </body>
    </html>
  `);
  const duration = await page.$eval('#v', (video) => new Promise((resolve) => {
    if (video.readyState >= 1) resolve(video.duration);
    video.onloadedmetadata = () => resolve(video.duration);
  }));
  console.log(JSON.stringify({ duration }));
  const times = [];
  for (let t = 0; t <= duration + 0.001; t += 0.25) times.push(Math.min(t, duration));
  for (const t of times) {
    await page.$eval('#v', (video, time) => new Promise((resolve) => {
      video.onseeked = () => resolve();
      video.currentTime = time;
    }), t);
    const file = `${outDir}/shot_${String(Math.round(t * 100)).padStart(4, '0')}_${t.toFixed(2)}s.png`;
    await page.screenshot({ path: file });
    console.log(file);
  }
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
