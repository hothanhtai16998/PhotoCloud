import {test, mock} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import express from 'express';

const owner = '000000000000000000000001';
let records = [], storageCalls = 0;
const queries = [];
function matches(row, filter) {
    return Object.entries(filter).every(([key, value]) => {
        if (key === '$or') return value.some(part => matches(row, part));
        if (value?.$exists !== undefined) return Object.hasOwn(row, key) === value.$exists;
        return value === null ? row[key] == null : row[key] === value;
    });
}
const query = value => ({
    select(){return this}, populate(){return this}, sort(){return this},
    skip(){return this}, limit(){return this}, lean:async()=>value,
});
mock.module('../src/models/Image.js', {exports:{default:{
    find(filter){queries.push(filter);return query(records.filter(row=>matches(row,filter)))},
    findOne(filter){queries.push(filter);return query(records.find(row=>matches(row,filter)))},
    countDocuments:async filter=>{queries.push(filter);return records.filter(row=>matches(row,filter)).length},
}}});
mock.module('../src/models/Notification.js',{exports:{default:{create:async()=>{}}}});
mock.module('../src/config/storage.js',{exports:{getImageFromR2:async()=>{
    storageCalls++;return {ContentType:'image/webp',Body:Readable.from(['fixture bytes'])};
}}});
const {proxyImage}=await import('../src/controllers/image/imageProxyController.js');
const {getImagesByUserId,downloadImage,getImageById}=await import('../src/controllers/image/imageCRUDController.js');

test('public image visibility, storage gating, legacy images and owner-only pending list',async()=>{
    const states=['approved','pending','rejected','flagged',null,undefined];
    records=states.map((state,i)=>({_id:String(i+10).padStart(24,'0'),uploadedBy:owner,imageUrl:'https://example.test/fixture.webp',...(state===undefined?{}:{moderationStatus:state})}));
    const app=express();
    // Simulates identities already verified by optionalAuth; never trusts a query user ID.
    app.use((req,res,next)=>{if(req.headers['x-test-user'])req.user={_id:req.headers['x-test-user']};next()});
    app.get('/proxy/:imageId',proxyImage);app.get('/download/:imageId',downloadImage);
    app.get('/detail/:imageId',getImageById);app.get('/user/:userId',getImagesByUserId);
    const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
    const base=`http://127.0.0.1:${server.address().port}`;
    try {
        for(const row of records)for(const route of ['proxy','download','detail']){
            const allowed=!row.moderationStatus||row.moderationStatus==='approved';
            const before=storageCalls;
            const res=await fetch(`${base}/${route}/${row._id}`);
            assert.equal(res.status,allowed?200:404,`${route} ${row.moderationStatus}`);
            await res.text();
            assert.equal(storageCalls-before,allowed&&route!=='detail'?1:0);
            if(allowed&&route!=='detail')assert.equal(res.headers.get('cache-control'),'no-store');
        }
        for(const identity of [null,'000000000000000000000099',owner]){
            const res=await fetch(`${base}/user/${owner}`,{headers:identity?{'x-test-user':identity}:{}});
            const data=await res.json();
            assert.equal(data.images.length,identity===owner?6:3);
            assert.equal(data.pagination.total,data.images.length);
            assert.deepEqual(queries.at(-1),queries.at(-2),'count uses list filter');
            if(identity===owner)assert.match(res.headers.get('cache-control'),/no-store/);
            assert.match(res.headers.get('vary'),/Authorization/);
        }
        const invalid=await fetch(`${base}/proxy/not-an-id`);assert.equal(invalid.status,400);await invalid.text();
    } finally {await new Promise(resolve=>server.close(resolve))}
});
