const fs=require('node:fs'),ts=require('typescript');
const catalog=JSON.parse(fs.readFileSync('src/pages/admin/i18n/adminMessages.json','utf8'));
const missing=new Set(),bad=[];let count=0;
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory()){if(e.name!=='i18n')walk(p);continue;}if(!/\.tsx?$/.test(p)||p.endsWith('adminLocale.ts'))continue;const source=ts.createSourceFile(p,fs.readFileSync(p,'utf8'),99,true);function check(node){if(ts.isCallExpression(node)&&node.expression.getText(source)==='adminText'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])){count++;const key=node.arguments[0].text.replace(/\s+/g,' ').trim();if(!catalog[key])missing.add(key);}ts.forEachChild(node,check);}check(source);}}walk('src/pages/admin');walk('src/components/admin');
for(const [key,value] of Object.entries(catalog)){const tokens=s=>[...s.matchAll(/\{([^}]+)\}/g)].map(m=>m[1]).sort().join(',');if(tokens(key)!==tokens(value))bad.push(key);}
fs.writeFileSync('qa-policy-checkbox/admin-language-coverage.json',JSON.stringify({calls:count,catalogEntries:Object.keys(catalog).length,missing:[...missing],badPlaceholders:bad},null,2));
console.log(JSON.stringify({calls:count,entries:Object.keys(catalog).length,missing:[...missing],badPlaceholders:bad}));if(missing.size||bad.length)process.exitCode=1;
