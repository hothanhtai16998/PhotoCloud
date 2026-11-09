import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import jwt from 'jsonwebtoken';
let authenticate,user;
mock.module('socket.io',{namedExports:{Server:class {use(fn){authenticate=fn;} on(){} }}});
mock.module('../src/config/env.js',{namedExports:{env:{ACCESS_TOKEN_SECRET:'fixture-secret',CLIENT_URL:'http://localhost'}}});
mock.module('../src/models/User.js',{defaultExport:{findById:()=>({select:()=>({lean:async()=>user})})}});
mock.module('../src/services/permissions/adminUtils.js',{namedExports:{enrichUserWithAdminStatus:async x=>x}});
const {initializeSocketServer}=await import('../src/services/realtime/socketServer.js');
initializeSocketServer({});
const token=jwt.sign({userId:'user'},'fixture-secret');
const socket=()=>({handshake:{auth:{token},address:'127.0.0.1'}});
function run(s){return new Promise(resolve=>authenticate(s,resolve));}
test('WebSocket handshake applies account ban status before attaching the user',async()=>{
 user={_id:'user',isBanned:true};const banned=socket();assert.match((await run(banned)).message,/access denied/);assert.equal(banned.user,undefined);
 user={_id:'user',isBanned:false};const active=socket();assert.equal(await run(active),undefined);assert.equal(active.userId,'user');
 user=null;assert.match((await run(socket())).message,/not found/);
});
