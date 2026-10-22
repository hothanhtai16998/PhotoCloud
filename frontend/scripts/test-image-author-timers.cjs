const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/pages/image/useImagePageController.ts'), 'utf8');
let next = 0;
const timers = new Map();
let hovered = false, focused = false, shown = true, animated = true;
const context = {
  authorTooltipTimeoutRef: {current:null}, authorHideTimeoutRef:{current:null}, authorFadeTimeoutRef:{current:null},
  pageActiveRef:{current:true},
  authorAreaRef:{current:{matches:()=>hovered}}, authorTooltipRef:{current:{matches:()=>focused}},
  setTimeout:callback=>{timers.set(++next,callback);return next;}, clearTimeout:id=>timers.delete(id),
  setTooltipAnimating:value=>{animated=value;}, setShowAuthorTooltip:value=>{shown=value;},
};
function callback(name) {
  const start=source.indexOf(`const ${name} = useCallback(() => {`);
  assert(start>=0);
  const body=source.slice(start).split('useCallback(() => {')[1].split(/\}, \[(?:clearAuthorTimers)?\]\);/)[0];
  return Function(...Object.keys(context),body).bind(null,...Object.values(context));
}
context.clearAuthorTimers=callback('clearAuthorTimers');
const cancel=callback('cancelAuthorHide'), hide=callback('scheduleAuthorHide');
function tick(){const entry=timers.entries().next().value;assert(entry);timers.delete(entry[0]);entry[1]();}
context.authorTooltipTimeoutRef.current=context.setTimeout(()=>{throw Error('stale open');});
hide(); assert.equal(timers.size,1); cancel(); assert.equal(timers.size,0);
hide();tick();assert.equal(animated,false);assert.equal(timers.size,1);
cancel();assert.equal(animated,true);assert.equal(timers.size,0);assert.equal(shown,true);
focused=true;hide();tick();assert.equal(timers.size,0);assert.equal(shown,true);
focused=false;hide();tick();tick();assert.equal(shown,false);
shown=true;hide();context.pageActiveRef.current=false;context.clearAuthorTimers();assert.equal(timers.size,0);
hide();tick();assert.equal(timers.size,0);assert.equal(shown,true);
assert(!source.includes('.hideTimeout'));
console.log('Author popup timer cancellation, re-entry, focus and cleanup: passed');
