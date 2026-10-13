const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const esbuild = require('esbuild');
const { io } = require('socket.io-client');
const { Server } = require('../../backend/node_modules/socket.io');
const root = path.resolve(__dirname, '..');

(async () => {
  const output = esbuild.buildSync({entryPoints:[path.join(root,'src/utils/socketServerUrl.ts')],bundle:true,platform:'node',format:'cjs',write:false});
  const module = {exports:{}};
  new Function('module','exports',output.outputFiles[0].text)(module,module.exports);
  const resolve = module.exports.socketServerUrl;
  const origin = 'http://127.0.0.1:5175';
  const cases = [
    ['http://localhost:3000/api','http://localhost:3000'],
    ['https://api.example.com/api','https://api.example.com'],
    ['https://api.example.com/v1/api/','https://api.example.com'],
    ['/api',origin],['/gateway/api',origin],[undefined,origin],
  ];
  cases.forEach(([base,expected])=>assert.equal(resolve(base,origin),expected));
  const httpServer = http.createServer();
  const socketServer = new Server(httpServer);
  socketServer.use((socket,next)=>socket.handshake.auth.token==='fixture-token' ? next() : next(Error('Authentication required')));
  socketServer.on('connection', socket=>socket.emit('notification',{type:'fixture',message:'mock only'}));
  await new Promise(done=>httpServer.listen(0,'127.0.0.1',done));
  const address = httpServer.address();
  const client = io(resolve(`http://127.0.0.1:${address.port}/api`,origin),{auth:{token:'fixture-token'},transports:['websocket'],reconnection:false});
  try {
    await new Promise((done,reject)=>{
      const timer=setTimeout(()=>reject(Error('Fixture socket timeout')),5000);
      client.on('connect_error',error=>{clearTimeout(timer);reject(error);});
      client.on('notification',data=>{clearTimeout(timer);try{assert.equal(data.type,'fixture');done();}catch(e){reject(e);}});
    });
    const result={urlCases:cases.length,authenticatedMockConnection:true,notificationReceived:true,realAccountTested:false};
    fs.writeFileSync(path.join(root,'socket-server-checks.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify(result));
  } finally {client.disconnect();await new Promise(done=>socketServer.close(done));}
})().catch(error=>{console.error(error);process.exitCode=1;});
