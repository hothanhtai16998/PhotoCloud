import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
let used=false,claimCalls=0,saves=0,saveFails=false,account;
mock.module('bcrypt',{defaultExport:{genSalt:async()=> 'salt',hash:async password=> 'hashed:'+password}});
mock.module('../src/models/User.js',{defaultExport:{}});
mock.module('../src/models/Notification.js',{defaultExport:{}});
mock.module('../src/services/auth/passwordRequirements.js',{namedExports:{getPasswordRequirements:async()=>({})}});
mock.module('../src/models/PasswordResetToken.js',{defaultExport:{
 findByToken:async()=>({_id:'fixture-token',userId:account}),
 consumeToken:async()=>{claimCalls++;if(used)return null;used=true;return {_id:'fixture-token'};},
}});
const {resetPassword}=await import('../src/controllers/user/userPasswordController.js');
function run(password){return new Promise((resolve,reject)=>{
 const res={status(code){this.code=code;return this;},json(body){resolve({code:this.code,body});}};
 resetPassword({body:{token:'fixture-token',password}},res,reject);
});}
function reset(){used=false;claimCalls=0;saves=0;saveFails=false;account={_id:'fixture-user',save:async()=>{saves++;if(saveFails)throw new Error('fixture write failed');}};}
test('concurrent resets sharing one token write the password at most once',async()=>{
 reset();const results=await Promise.all([run('password-one'),run('password-two')]);
 assert.deepEqual(results.map(x=>x.code).sort(),[200,400]);assert.equal(saves,1);assert.equal(claimCalls,2);
});
test('claim lost or expired during hashing stops before save; OAuth is rejected before claim',async()=>{
 reset();used=true;assert.equal((await run('password-one')).code,400);assert.equal(saves,0);
 reset();account.isOAuthUser=true;assert.equal((await run('password-one')).code,400);assert.equal(claimCalls,0);assert.equal(saves,0);
});
test('uncertain password save failure does not reopen a consumed token',async()=>{
 reset();saveFails=true;await assert.rejects(run('password-one'),/fixture write failed/);assert.equal(used,true);
 saveFails=false;assert.equal((await run('password-two')).code,400);assert.equal(saves,1);
});
