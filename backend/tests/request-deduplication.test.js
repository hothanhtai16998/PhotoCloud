import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {requestDeduplication} from '../src/middlewares/requestDeduplication.js';
const req=path=>({method:'GET',path,headers:{},query:{}});
const response=()=>Object.assign(new EventEmitter(),{
    statusCode:200,json(data){this.data=data;return this},status(code){this.statusCode=code;return this},
});
test('dedup handles close/error/non-JSON, preserves JSON/status and skips private requests',async()=>{
    for(const event of ['close','error','finish']){
        const request=req('/dedup-'+event),first=response();let next=0;
        requestDeduplication(request,first,()=>next++);
        const waiting=requestDeduplication(request,response(),()=>next++);
        first.emit(event);
        await waiting;assert.equal(next,2);
    }
    const request=req('/dedup-json'),first=response(),second=response();
    requestDeduplication(request,first,()=>{});
    const waiting=requestDeduplication(request,second,()=>assert.fail('must replay JSON'));
    first.status(201).json({ok:true});first.emit('finish');first.emit('close');
    await waiting;assert.equal(second.statusCode,201);assert.deepEqual(second.data,{ok:true});
    for(const headers of [{authorization:'Bearer test'},{cookie:'test=1'}]){
        let next=0;requestDeduplication({...req('/dedup-private'),headers},response(),()=>next++);
        assert.equal(next,1);
    }
    const abandoned=response();requestDeduplication(req('/dedup-no-subscriber'),abandoned,()=>{});abandoned.emit('error',new Error('fixture'));
});
test('dedup bounds waiting for an original that never finishes',async()=>{
    let next=0;const request=req('/dedup-timeout');
    requestDeduplication(request,response(),()=>next++);
    const waiting=requestDeduplication(request,response(),()=>next++);
    await Promise.all([waiting,delay(2100)]);assert.equal(next,2);
});
test('an old response cannot remove the replacement entry for the same key',async()=>{
    const request=req('/dedup-replacement'),old=response(),fresh=response();
    requestDeduplication(request,old,()=>{});await delay(1050);
    requestDeduplication(request,fresh,()=>{});
    old.emit('close');let next=0;const follower=response();
    const waiting=requestDeduplication(request,follower,()=>next++);
    fresh.json({fresh:true});fresh.emit('finish');await waiting;
    assert.equal(next,0);assert.deepEqual(follower.data,{fresh:true});
});
