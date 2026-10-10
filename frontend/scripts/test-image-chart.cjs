const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('assert/strict'),path=require('path');
function load(file,mocks){ const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:name=>mocks[name],Date,Map});return exports; }
const {useImageChart}=load('src/components/NoFlashGrid/hooks/useImageChart.ts',{'react':{useMemo:fn=>fn()},'@/config/chartConfig':{chartConfig:{daysToDisplay:14,daysAgoOffset:13}}});
const today=new Date(),key=today.toISOString().slice(0,10);
const image={createdAt:new Date(today.getTime()-2*86400000).toISOString(),views:20,downloads:5,dailyViews:{[key]:3},dailyDownloads:{[key]:1}};
let result=useImageChart(image);
assert.equal(result.chartData.length,14);
assert.equal(result.chartData.reduce((v,p)=>v+p.views,0),20);
assert.equal(result.chartData.reduce((v,p)=>v+p.downloads,0),5);
assert.equal(result.maxViews,17);
assert.equal(result.maxDownloads,4);
assert.ok(result.chartData.filter(p=>p.isBeforePublished).every(p=>p.views===0&&p.downloads===0));
result=useImageChart({...image,dailyViews:{},dailyDownloads:{}});
assert.equal(result.maxViews,20);assert.equal(result.maxDownloads,5);
result=useImageChart({...image,views:0,downloads:0,dailyViews:{},dailyDownloads:{}});
assert.equal(result.maxViews,1);assert.ok(result.chartData.every(p=>p.views===0&&p.downloads===0));
console.log('PASS: chart totals, tracked/untracked buckets, publication guard, empty history and zero maxima.');
