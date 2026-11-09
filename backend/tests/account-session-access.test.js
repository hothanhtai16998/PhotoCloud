import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import jwt from 'jsonwebtoken';
let session,user,deleted=0,failLookup=false,enriched=0;
mock.module('../src/config/env.js',{namedExports:{env:{ACCESS_TOKEN_SECRET:'fixture-secret'}}});
mock.module('../src/models/Session.js',{defaultExport:{findOne:async()=>session,deleteOne:async()=>deleted++,deleteMany:async()=>deleted++}});
mock.module('../src/models/User.js',{defaultExport:{findById:()=>({select:()=>({lean:async()=>{if(failLookup)throw new Error('database unavailable');return user;}})})}});
mock.module('../src/services/permissions/adminUtils.js',{namedExports:{enrichUserWithAdminStatus:async value=>{enriched++;return value;}}});
mock.module('../src/services/audit/auditLogger.js',{namedExports:{getClientIp:()=> '127.0.0.1'}});
const {refreshToken}=await import('../src/controllers/auth/sessionController.js');
const {protectedRoute,optionalAuth}=await import('../src/middlewares/authMiddleware.js');
function run(handler,req){return new Promise((resolve,reject)=>{
 const res={status(code){this.code=code;return this;},json(body){resolve({code:this.code,body});}};
 handler(req,res,error=>error?reject(error):resolve({next:true}));
});}
test('refresh rejects missing/expired sessions, banned and deleted accounts; DB failures do not become success',async()=>{
 assert.equal((await run(refreshToken,{cookies:{}})).code,401);
 session=null;assert.equal((await run(refreshToken,{cookies:{refreshToken:'fixture'}})).code,403);
 for(const expiry of [new Date(0),new Date(),'invalid']){
  session={userId:'user',expiresAt:expiry};assert.equal((await run(refreshToken,{cookies:{refreshToken:'fixture'}})).code,403);
 }
 session={userId:'user',expiresAt:new Date(Date.now()+60000)};
 for(const account of [null,{_id:'user',isBanned:true}]){
  user=account;assert.equal((await run(refreshToken,{cookies:{refreshToken:'fixture'}})).code,403);
 }
 assert.equal(deleted,5);
 user={_id:'user',isBanned:false};const result=await run(refreshToken,{cookies:{refreshToken:'fixture'}});
 assert.equal(result.code,200);assert.equal(jwt.verify(result.body.accessToken,'fixture-secret').userId,'user');
 failLookup=true;await assert.rejects(run(refreshToken,{cookies:{refreshToken:'fixture'}}),/database unavailable/);failLookup=false;
});
test('existing access tokens cannot attach banned accounts or reach protected handlers',async()=>{
 const token=jwt.sign({userId:'user'},'fixture-secret');
 user={_id:'user',isBanned:true};enriched=0;
 const req=()=>({headers:{authorization:'Bearer '+token}});
 assert.equal((await run(protectedRoute,req())).code,403);
 const optional=req();assert.deepEqual(await run(optionalAuth,optional),{next:true});assert.equal(optional.user,undefined);assert.equal(enriched,0);
 user={_id:'user',isBanned:false};assert.deepEqual(await run(protectedRoute,req()),{next:true});assert.equal(enriched,1);
 user=null;assert.equal((await run(protectedRoute,req())).code,404);
});
