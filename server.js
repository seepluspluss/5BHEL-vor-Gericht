'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const QRCode=require('qrcode');
const root=__dirname,port=Number(process.env.PORT||3000),rooms=new Map();
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||'';
const sessions=new Map();
const observerInvites=new Map(); // token -> {code, expires, revoked}

if(!ADMIN_PASSWORD){console.error('ADMIN_PASSWORD fehlt. Setze die Umgebungsvariable in Render.');process.exit(1)}
function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=').slice(0,2)).filter(x=>x.length===2))}
function isAdmin(req){const t=cookies(req).court_admin;return !!t&&sessions.has(t)&&sessions.get(t)>Date.now()}
function adminOnly(req,res){if(isAdmin(req))return false;send(res,403,{error:'Nur für angemeldete Moderatoren'});return true}

const MAX_ROOMS=80,MAX_PEOPLE=120,ROOM_TTL=6*60*60*1000;
setInterval(()=>{const now=Date.now();for(const [id,r] of rooms)if(now-r.created>ROOM_TTL)rooms.delete(id)},15*60*1000).unref();
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
function send(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',b=>{s+=b;if(s.length>8192){reject(Error('Anfrage zu groß'));req.destroy();}});req.on('end',()=>{try{resolve(JSON.parse(s||'{}'))}catch{reject(Error('Ungültiges JSON'))}});req.on('error',reject)})}
function code(){let c;do{c=String(crypto.randomInt(100000,1000000))}while(rooms.has(c));return c}
function publicRoom(r){return {code:r.code,question:r.question,open:r.open,counts:[0,1,2].map(i=>[...r.votes.values()].filter(v=>v===i).length),participants:r.people.size,version:r.version,winner:r.winner,closed:r.closed}}
function auth(r,t){return r&&r.host===t}
async function api(req,res,url){let p;try{p=await body(req)}catch(e){return send(res,400,{error:e.message})}
if(url.pathname==='/api/admin-login'){if(!ADMIN_PASSWORD||typeof p.password!=='string'||Buffer.byteLength(p.password)>512)return send(res,403,{error:'Zugriff verweigert'});const a=Buffer.from(p.password),b=Buffer.from(ADMIN_PASSWORD);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return send(res,403,{error:'Falsches Moderator-Passwort'});const token=crypto.randomBytes(32).toString('hex');sessions.set(token,Date.now()+12*60*60*1000);res.setHeader('Set-Cookie',`court_admin=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=43200`);return send(res,200,{ok:true})}
if(url.pathname==='/api/create'){if(adminOnly(req,res))return;if(rooms.size>=MAX_ROOMS)return send(res,429,{error:'Zu viele aktive Räume'});let c=code(),host=crypto.randomBytes(24).toString('hex');rooms.set(c,{code:c,host,created:Date.now(),people:new Map(),votes:new Map(),question:null,open:false,winner:null,closed:false,version:0});return send(res,200,{code:c,host})}
let r=rooms.get(String(p.code||''));if(!r)return send(res,404,{error:'Raum nicht gefunden'});
if(url.pathname==='/api/join'){if(r.closed)return send(res,403,{error:'Raum geschlossen'});if(r.people.size>=MAX_PEOPLE)return send(res,429,{error:'Raum ist voll'});let name=String(p.name||'').trim().slice(0,32);if(!name)return send(res,400,{error:'Bitte Namen eingeben'});let token=crypto.randomBytes(24).toString('hex');r.people.set(token,name);r.version++;return send(res,200,{token,name,room:publicRoom(r)})}
if(url.pathname==='/api/vote'){if(!r.people.has(p.token))return send(res,403,{error:'Bitte erneut anmelden'});if(!r.open||!r.question)return send(res,409,{error:'Aktuell keine Abstimmung'});if(!Number.isInteger(p.choice)||p.choice<0||p.choice>2)return send(res,400,{error:'Ungültige Antwort'});if(r.votes.has(p.token))return send(res,409,{error:'Du hast bereits abgestimmt'});r.votes.set(p.token,p.choice);r.version++;return send(res,200,{ok:true})}
if(url.pathname==='/api/open'){if(adminOnly(req,res))return;if(!auth(r,p.host))return send(res,403,{error:'Moderator-Zugriff verweigert'});if(!Number.isInteger(p.case)||p.case<0||p.case>2||!Number.isInteger(p.question)||p.question<0||p.question>3)return send(res,400,{error:'Ungültige Frage'});r.question={case:p.case,question:p.question};r.votes.clear();r.winner=null;r.open=true;r.version++;return send(res,200,{room:publicRoom(r)})}
if(url.pathname==='/api/close'){if(adminOnly(req,res))return;if(!auth(r,p.host))return send(res,403,{error:'Moderator-Zugriff verweigert'});if(!r.open)return send(res,409,{error:'Keine offene Abstimmung'});let counts=publicRoom(r).counts,max=Math.max(...counts);r.open=false;r.winner=max===0?null:[0,1,2].filter(i=>counts[i]===max)[crypto.randomInt(counts.filter(v=>v===max).length)];r.version++;return send(res,200,{room:publicRoom(r),tie:max>0&&counts.filter(v=>v===max).length>1})}
if(url.pathname==='/api/observer-invite'){if(adminOnly(req,res))return;if(!auth(r,p.host))return send(res,403,{error:'Moderator-Zugriff verweigert'});for(const [token,v] of observerInvites)if(v.code===r.code)observerInvites.delete(token);const token=crypto.randomBytes(24).toString('hex');observerInvites.set(token,{code:r.code,expires:Date.now()+4*60*60*1000});return send(res,200,{token,expiresInMinutes:240})}
if(url.pathname==='/api/observer-revoke'){if(adminOnly(req,res))return;if(!auth(r,p.host))return send(res,403,{error:'Moderator-Zugriff verweigert'});for(const [token,v] of observerInvites)if(v.code===r.code)observerInvites.delete(token);return send(res,200,{ok:true})}
if(url.pathname==='/api/end'){if(adminOnly(req,res))return;if(!auth(r,p.host))return send(res,403,{error:'Moderator-Zugriff verweigert'});r.closed=true;r.open=false;r.version++;return send(res,200,{ok:true})}
return send(res,404,{error:'Unbekannter Endpunkt'});
}
http.createServer(async(req,res)=>{let url;try{url=new URL(req.url,'http://localhost')}catch{return send(res,400,{error:'Ungültige URL'})}
if(req.method==='POST'&&url.pathname.startsWith('/api/'))return api(req,res,url).catch(()=>send(res,500,{error:'Serverfehler'}));
if(req.method==='GET'&&url.pathname==='/api/admin-status')return send(res,200,{admin:isAdmin(req)});
if(req.method==='GET'&&url.pathname==='/api/qr'){if(adminOnly(req,res))return;const code=url.searchParams.get('code');if(!rooms.has(code))return send(res,404,{error:'Raum nicht gefunden'});const target=`https://${req.headers.host}/abstimmen.html?code=${encodeURIComponent(code)}`;try{const png=await QRCode.toBuffer(target,{type:'png',width:360,margin:2});res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'no-store'});return res.end(png)}catch{return send(res,500,{error:'QR-Code Fehler'})}}
if(req.method==='GET'&&url.pathname==='/health'){return send(res,200,{ok:true})}
if(req.method==='GET'&&url.pathname==='/api/observer-state'){const token=url.searchParams.get('token')||'';const inv=observerInvites.get(token);if(!inv||inv.expires<Date.now())return send(res,403,{error:'Zugang ungültig oder abgelaufen'});const r=rooms.get(inv.code);if(!r)return send(res,404,{error:'Raum nicht mehr verfügbar'});return send(res,200,{room:publicRoom(r)})}
if(req.method==='GET'&&url.pathname==='/api/state'){let r=rooms.get(url.searchParams.get('code'));if(!r)return send(res,404,{error:'Raum nicht gefunden'});return send(res,200,{room:publicRoom(r)})}
if(req.method!=='GET')return send(res,405,{error:'Methode nicht erlaubt'});
let filename;try{filename=decodeURIComponent(url.pathname)}catch{return send(res,400,{error:'Ungültiger Pfad'})}if(filename==='/')filename='/index.html';
if(filename==='/index.html'&&!isAdmin(req)){res.writeHead(302,{Location:'/login.html','Cache-Control':'no-store'});return res.end()}
const allowed=new Set(['/index.html','/abstimmen.html','/login.html','/beobachten.html','/css/style.css','/js/cases.js','/js/game.js','/js/live-host.js']);
if(!allowed.has(filename))return send(res,404,{error:'Nicht gefunden'});let full=path.resolve(root,'.'+filename);if(!full.startsWith(root+path.sep))return send(res,403,{error:'Zugriff verweigert'});
fs.stat(full,(e,s)=>{if(e||!s.isFile())return send(res,404,{error:'Nicht gefunden'});res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});fs.createReadStream(full).pipe(res)})
}).listen(port,'0.0.0.0',()=>console.log('5BHEL Live-Abstimmung: http://localhost:'+port));
