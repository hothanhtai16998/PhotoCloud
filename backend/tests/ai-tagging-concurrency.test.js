import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
let image,tags=[],resolveAI,writes=0,lastUpdate;
mock.module('../src/services/ai/aiTaggingService.js',{namedExports:{generateAITags:()=>new Promise(resolve=>{resolveAI=resolve;}),mergeTags:(user,ai)=>[...new Set([...user,...ai])]}});
mock.module('../src/services/ai/tagTranslator.js',{namedExports:{translateTags:async x=>x,getTargetLanguage:async()=> 'vi'}});
mock.module('../src/models/Image.js',{defaultExport:{
 findById:()=>({select:()=>({lean:async()=>image?structuredClone(image):null})}),
 updateOne:async(query,update)=>{lastUpdate={query,update};if(!image||JSON.stringify(image.tags)!==JSON.stringify(query.tags))return {matchedCount:0};writes++;image.tags=update.$set.tags;return {matchedCount:1};},
}});
const {addAITaggingJob,getAITaggingQueueStatus}=await import('../src/workers/aiTaggingQueue.js');
async function until(check){for(let i=0;i<100;i++){if(check())return;await new Promise(r=>setTimeout(r,2));}assert.fail('queue did not settle');}
async function start(initial){image=initial;writes=0;resolveAI=undefined;lastUpdate=undefined;addAITaggingJob({imageId:'fixture',buffer:Buffer.from('fixture'),mimetype:'image/png',userTags:['old-upload']});if(initial)await until(()=>resolveAI);}
async function finish(result){resolveAI(result);await until(()=>getAITaggingQueueStatus().activeJobs===0);}
test('AI result preserves concurrent tag edits/deletions and uses current tags rather than upload snapshot',async()=>{
 await start({tags:['current']});image.tags=['edited'];await finish(['ai']);assert.deepEqual(image.tags,['edited']);assert.equal(writes,0);
 await start({tags:['current']});image=null;await finish(['ai']);assert.equal(writes,0);
 await start({tags:['current']});await finish(['ai']);assert.deepEqual(image.tags,['current','ai']);assert.equal(writes,1);
 await start({tags:['current']});await finish([]);assert.equal(writes,0);assert.equal(lastUpdate,undefined);
 await start(null);await until(()=>getAITaggingQueueStatus().activeJobs===0);assert.equal(resolveAI,undefined);
});
