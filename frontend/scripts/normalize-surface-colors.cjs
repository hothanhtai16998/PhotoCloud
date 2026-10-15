// Mechanical migration of fixed neutral surfaces to the shared theme tokens.
const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');
const root = path.resolve(__dirname, '../src');
const results = [];
function walk(directory) {
  for (const item of fs.readdirSync(directory, {withFileTypes:true})) {
    const file = path.join(directory,item.name);
    if (item.isDirectory()) { if (item.name !== 'preview') walk(file); continue; }
    if (!file.endsWith('.css') || /TimedCardSlider\.css$/.test(file)) continue;
    const source=fs.readFileSync(file,'utf8');
    const css=postcss.parse(source);let count=0;
    css.walkDecls(declaration=>{
      if (!['background','background-color'].includes(declaration.prop)) return;
      if (!/^(white|#fff|#ffffff)$/i.test(declaration.value.trim())) return;
      declaration.value='var(--bg-card, #FAF8F4)';count++;
      declaration.parent.nodes?.forEach(sibling=>{
        if (sibling.type==='decl' && sibling.prop==='color' && /^(#000|#000000|black|#222|#333|#444)$/i.test(sibling.value.trim())) sibling.value='var(--text-primary, #1B1B19)';
      });
    });
    if(count){fs.writeFileSync(file,css.toString());results.push({file:path.relative(root,file),surfaces:count});}
  }
}
walk(root);
console.log(JSON.stringify(results,null,2));
