import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {setTimeout as sleep} from 'node:timers/promises';
const port=31000+Math.floor(Math.random()*20000);
const proc=spawn(process.execPath,['server.js'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'ignore'});
const base=`http://127.0.0.1:${port}`;
async function post(route,body){const r=await fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()}}
try{
 let ready=false;for(let i=0;i<40;i++){try{let r=await fetch(base+'/health');if(r.ok){ready=true;break}}catch{}await sleep(100)}assert(ready,'server not ready');
 assert.equal((await fetch(base+'/server.js')).status,404,'server code must not be public');
 const cr=await post('create',{});assert.equal(cr.status,200);const {code,host}=cr.data;
 const a=await post('join',{code,name:'Schüler A'}),b=await post('join',{code,name:'Schüler B'});assert.equal(a.status,200);assert.equal(b.status,200);
 assert.equal((await post('open',{code,host:'wrong',case:0,question:0})).status,403);
 assert.equal((await post('open',{code,host,case:0,question:0})).status,200);
 assert.equal((await post('vote',{code,token:a.data.token,choice:1})).status,200);
 assert.equal((await post('vote',{code,token:a.data.token,choice:2})).status,409);
 assert.equal((await post('vote',{code,token:b.data.token,choice:1})).status,200);
 const close=await post('close',{code,host});assert.equal(close.data.room.winner,1);
 assert.deepEqual(close.data.room.counts,[0,2,0]);
 assert.equal((await post('vote',{code,token:b.data.token,choice:2})).status,409);
 console.log('PASS: health, private files, room, join, auth, vote, duplicate vote, majority, close');
}finally{proc.kill()}
