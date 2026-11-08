import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
let result, calls=0, validity={valid:true};
mock.module('../src/services/permissions/adminUtils.js',{namedExports:{
 computeAdminStatus:async(id,ip)=>{calls++;assert.equal(id,'user');return result;},
 isAdminRoleValid:()=>validity,
}});
const {adminRoute}=await import('../src/middlewares/adminMiddleware.js');
const {requirePermission,requireSuperAdmin,hasPermission}=await import('../src/middlewares/permissionMiddleware.js');
const role={role:'admin',permissions:{viewUsers:true}};
function run(handler,req){return new Promise((resolve,reject)=>{
 const res={status(code){this.code=code;return this;},json(body){resolve({code:this.code,body});}};
 handler(req,res,error=>error?reject(error):resolve({next:true}));
});}
test('admin and permission guards retain missing-user, cached flags, grants and denials',async()=>{
 for(const handler of [adminRoute,requirePermission('viewUsers'),requireSuperAdmin]) assert.equal((await run(handler,{})).code,401);
 calls=0;result={isAdmin:true,isSuperAdmin:false,adminRole:role,validation:{valid:true}};
 let req={user:{_id:'user'},clientIP:'127.0.0.1'};
 assert.deepEqual(await run(adminRoute,req),{next:true});assert.equal(req.adminRole,role);assert.equal(req.user._adminRole,undefined);assert.equal(calls,1);
 req={user:{_id:'user'}};
 assert.deepEqual(await run(requirePermission('viewUsers'),req),{next:true});assert.equal(req.user._adminRole,role);
 assert.equal((await run(requirePermission('deleteUsers'),req)).code,403);
 validity={valid:false,reason:'expired'};assert.match((await run(requirePermission('viewUsers'),req)).body.message,/expired/);validity={valid:true};
 const before=calls;req={user:{_id:'user',isAdmin:true,isSuperAdmin:false,_adminRole:role}};
 assert.deepEqual(await run(adminRoute,req),{next:true});assert.equal(calls,before);
 assert.deepEqual(await run(requirePermission('viewUsers'),req),{next:true});assert.equal(calls,before);
 req={user:{_id:'user',isAdmin:true,isSuperAdmin:true}};assert.deepEqual(await run(requirePermission('anything'),req),{next:true});
 result={isAdmin:false,isSuperAdmin:false,adminRole:null,validation:{valid:false}};
 assert.equal((await run(adminRoute,{user:{_id:'user'}})).code,403);
 assert.equal((await run(requirePermission('viewUsers'),{user:{_id:'user'}})).code,403);
 assert.equal(await hasPermission('user','viewUsers'),false);
});
