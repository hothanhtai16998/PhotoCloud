const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sources = [
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap',
];
const folder = 'src/assets/fonts/web';
(async () => {
  fs.mkdirSync(folder, { recursive: true });
  const styles = await Promise.all(sources.map(async source => {
    const response = await fetch(source, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36' } });
    if (!response.ok) throw new Error(`CSS ${response.status}`);
    return response.text();
  }));
  const urls = [...new Set(styles.flatMap(css => [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(match => match[1])))];
  const names = new Map();
  await Promise.all(urls.map(async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Font ${response.status}`);
    const name = crypto.createHash('sha256').update(url).digest('hex').slice(0, 16) + path.extname(new URL(url).pathname);
    fs.writeFileSync(path.join(folder, name), Buffer.from(await response.arrayBuffer()));
    names.set(url, name);
  }));
  const rules = [...new Set(styles.flatMap(css => css.match(/@font-face\s*\{[^}]+\}/g) || []))];
  fs.writeFileSync(path.join(folder, 'fonts.css'), '/* Self-hosted Google Fonts; see sources.json and OFL licenses. */\n' + rules.join('\n').replace(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g, (_, url) => `url('./${names.get(url)}')`));
  fs.writeFileSync(path.join(folder, 'sources.json'), JSON.stringify({ stylesheets: sources, files: Object.fromEntries(names) }, null, 2));
  for (const family of ['fraunces', 'inter', 'barlowcondensed']) {
    const response = await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${family}/OFL.txt`);
    if (!response.ok) throw new Error(`License ${family}: ${response.status}`);
    fs.writeFileSync(path.join(folder, `${family}-OFL.txt`), await response.text());
  }
  console.log(`Vendored ${urls.length} font resources with licenses.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
