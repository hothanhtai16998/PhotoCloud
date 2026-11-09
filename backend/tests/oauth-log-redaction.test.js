import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
const logs=[];
mock.module('../src/config/env.js',{namedExports:{env:{CLIENT_URL:'http://localhost'}}});
mock.module('../src/utils/logger.js',{namedExports:{logger:{error:(...args)=>logs.push(args),info(){},debug(){},warn(){}}}});
const {googleCallback}=await import('../src/controllers/auth/googleAuthController.js');
test('OAuth state mismatch logs no raw query or cookie state',async()=>{
 await new Promise((resolve,reject)=>googleCallback({query:{state:'query-private-fixture'},cookies:{oauth_state:'cookie-private-fixture'},ip:'127.0.0.1'},{redirect:()=>resolve()},reject));
 const output=JSON.stringify(logs);assert.ok(output.includes('state mismatch'));
 assert.equal(output.includes('query-private-fixture'),false);assert.equal(output.includes('cookie-private-fixture'),false);
});
