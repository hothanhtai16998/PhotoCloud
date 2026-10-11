const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/hooks/useImageDialogFocus.ts'),'utf8');
let cleanup,listener;const moves=[];
class Element {
  constructor(name){this.name=name;this.isConnected=true;this.tabIndex=0;}
  focus(options){assert.equal(options.preventScroll,true);document.activeElement=this;moves.push(this.name);}
  closest(selector){return selector==='[role="dialog"]'?this.owner:null;}
  getClientRects(){return this.visible===false?[]:[{}];}
}
const opener=new Element('opener'),first=new Element('first'),last=new Element('close'),hidden=new Element('hidden');hidden.visible=false;
const dialog=new Element('dialog');dialog.querySelectorAll=()=>[first,hidden,last];dialog.querySelector=()=>last;dialog.contains=node=>[dialog,first,last,hidden].includes(node);first.owner=last.owner=dialog;
const document={activeElement:opener,body:new Element('body'),addEventListener:(_key,fn)=>listener=fn,removeEventListener:()=>listener=null};
const context={exports:{},document,HTMLElement:Element,getComputedStyle:()=>({visibility:'visible'}),require:()=>({useRef:value=>({current:value}),useLayoutEffect:fn=>cleanup=fn()})};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const run=context.exports.useImageDialogFocus;
run({current:dialog},true);assert.equal(document.activeElement,last);
const tab=(shiftKey=false)=>({key:'Tab',shiftKey,preventDefault(){this.prevented=true;}});
let event=tab();listener(event);assert.equal(document.activeElement,first);assert.equal(event.prevented,true);
event=tab(true);listener(event);assert.equal(document.activeElement,last);
const child=new Element('child');child.owner=new Element('child dialog');document.activeElement=child;event=tab();listener(event);assert.equal(event.prevented,undefined);
document.activeElement=last;cleanup();assert.equal(document.activeElement,opener);assert.equal(listener,null);
run({current:dialog},true);document.activeElement=child;cleanup();assert.equal(document.activeElement,child,'do not steal focus after navigation');
run({current:dialog},false);assert.equal(listener,null,'standalone/mobile/background routes must not trap focus');
run({current:dialog},true,true);event=tab();listener(event);assert.equal(event.prevented,undefined,'Edit/Collection pauses the parent trap');cleanup();
console.log('Image dialog focus: boundary wrapping, hidden controls, child portal, restoration, cleanup and disabled scope passed.');
