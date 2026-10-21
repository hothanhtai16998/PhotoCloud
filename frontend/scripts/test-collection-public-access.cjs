const fs=require('fs'),path=require('path'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict');
const express=require('../../backend/node_modules/express');
let pipeline,detailQuery;
const publicRow={_id:'public',name:'Public fixture',isPublic:true,images:[],createdBy:{_id:'owner'},collaborators:[{user:{email:'private@example.test'}}]};
const model={aggregate:async p=>{pipeline=p;return [publicRow];},findOne:q=>{detailQuery=q;return {populate(){return this;},async lean(){return q._id==='private'&&q.isPublic ? null : publicRow;}};},findByIdAndUpdate:async()=>{}};
const crudContext={exports:{},require:name=>{
if(name.endsWith('/Collection.js'))return{default:model};
if(name.includes('inputUtils'))return{isValidObjectId:()=>true};
if(name==='mongoose')return{default:{Types:{ObjectId:class {constructor(id){this.id=id;}}}}};
if(name.includes('queryCache'))return{generateCacheKey:()=>'',cached:(_k,fn)=>fn()};
if(name.includes('logger'))return{logger:{error(){}}};return{};}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../../backend/src/controllers/collection/collectionCRUDController.js'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,crudContext);
const handlers=new Proxy(crudContext.exports,{get:(object,key)=>object[key]||((_q,res)=>res.json({success:true}))});
const routerContext={exports:{},require:name=>{
if(name==='express')return{default:express};
if(name.includes('collectionController'))return handlers;
if(name.includes('authMiddleware'))return{optionalAuth:(_q,_r,next)=>next(),protectedRoute:(req,res,next)=>req.headers.authorization?next():res.status(401).json({message:'login required'})};
if(name.includes('csrfMiddleware'))return{validateCsrf:(_q,_r,next)=>next()};throw Error(name);}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../../backend/src/routes/collectionRoute.js'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,routerContext);
(async()=>{const app=express();app.use('/api/collections',routerContext.exports.default);const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
try{const origin='http://127.0.0.1:'+server.address().port;
let response=await fetch(origin+'/api/collections?scope=browse');assert.equal(response.status,200);let body=await response.json();assert.equal(body.collections[0].collaborators,undefined);assert.equal(pipeline[0].$match.$or.length,1);assert.equal(pipeline[0].$match.$or[0].isPublic,true);
response=await fetch(origin+'/api/collections?scope=mine');assert.equal(response.status,401);
response=await fetch(origin+'/api/collections/public');assert.equal(response.status,200);body=await response.json();assert.equal(detailQuery.isPublic,true);assert.equal(body.collection.collaborators.length,0);
response=await fetch(origin+'/api/collections/private');assert.equal(response.status,404);
for(const [method,url] of [['POST','/api/collections'],['PATCH','/api/collections/public'],['DELETE','/api/collections/public'],['GET','/api/collections/public/export'],['GET','/api/collections/containing/photo']]){response=await fetch(origin+url,{method});assert.equal(response.status,401,method+' '+url);}
console.log('PASS: actual Express router with fixture auth/DB: guest browse/public detail 200; private 404; personal picker/export/mutations 401; no collaborator data.');
}finally{server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
