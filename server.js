const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const PORT=process.env.PORT||3000;
const FIRE=[22,33,44,55,66,77];
const CMD={stop:['⛔','STOP'],skull:['☠','COPRI'],three:['③','3!'],nocomm:['🤐','MUTI'],nojump:['🚫','NO ±10'],single:['☝','1 PILA'],draw1:['⬇','PESCA 1']};
let S=null;const games={};
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const hs=n=>n===1?8:n===2?7:6,cur=()=>S.players[S.turn];
const active=x=>S.piles.some(p=>p.x===x);
const need=()=>S.three?3:(S.deck.length?2:1);
const allEmpty=()=>!S.deck.length&&S.players.every(x=>!S.hands[x.id].length);
const logm=t=>{S.log=[t,...(S.log||[])].slice(0,6)};
const lab=c=>c.j?'JOLLY':c.r!=null?c.r+'–'+(c.r+9):c.v;
const key=c=>c.j?1000:c.r!=null?c.r+.5:c.v;
function deck(o){
 let d=[];for(let v=2;v<=99;v++)d.push({v,f:o.fire&&FIRE.includes(v)?1:0});
 if(o.ext){const ks=Object.keys(CMD),pool=shuffle(d.filter(c=>!c.f));for(let i=0;i<28;i++)pool[i].x=ks[i%7]}
 if(o.joker)for(let i=0;i<10;i++)d.push({j:1});
 if(o.tens)for(let k=1;k<=9;k++)d.push({r:k*10});
 return shuffle(d)}
function legal(pi,c){
 const p=S.piles[pi];
 if(S.three&&S.played>=3)return false;
 if(active('single')&&S.sp!=null&&S.sp!==pi)return false;
 if(c.x==='stop'&&S.three&&S.played!==2)return false;
 if(c.j)return p.m!=='jk';
 if(c.r!=null)return p.t>=c.r&&p.t<=c.r+9;
 const jp=!active('nojump');
 return p.u?(c.v>p.t||(jp&&c.v===p.t-10)):(c.v<p.t||(jp&&c.v===p.t+10))}
function start(){
 const n=S.players.length;S.deck=deck(S.opt);S.hands={};
 S.players.forEach(p=>S.hands[p.id]=S.deck.splice(0,hs(n)));
 S.piles=[1,1,0,0].map(u=>({t:u?1:100,u,f:0,m:0,x:null}));
 Object.assign(S,{turn:0,tn:1,played:0,sp:null,three:0,stopped:0,status:'play',log:[],msg:''});
 logm('La Santa Muerte ti aspetta…')}
function stuck(){const h=S.hands[cur().id];return S.played<need()&&!h.some(c=>S.piles.some((p,pi)=>legal(pi,c)))}
const lose=m=>{S.status='lost';S.msg=m};
function play(i,pi){
 const h=S.hands[cur().id],c=h.splice(i,1)[0],p=S.piles[pi];
 if(c.j){p.m='jk';p.x=null;p.f=0}
 else if(c.r!=null){p.t=p.u?c.r:c.r+9;p.m=0;p.x=null;p.f=0}
 else{p.t=c.v;p.f=c.f?S.tn+1:0;p.m=c.x==='skull'?'sk':0;p.x=c.x||null}
 S.played++;if(c.x==='three')S.three=1;if(c.x==='stop')S.stopped=1;
 if(active('single')&&S.sp==null)S.sp=pi;
 logm(cur().name+' gioca '+lab(c)+(c.f?' 🔥':c.x?' '+CMD[c.x][0]:''));
 if(S.stopped||allEmpty())return endTurn();
 if(stuck())lose(cur().name+' non può giocare il minimo di carte.')}
function endTurn(){
 if(S.three&&S.played!==3)return lose('Con "3!" servivano esattamente 3 carte.');
 if(S.piles.some(p=>p.f===S.tn))return lose('Una carta fuoco non è stata coperta in tempo!');
 if(S.piles.some(p=>p.m))return lose('Un teschio o un jolly è rimasto scoperto!');
 const h=S.hands[cur().id],lim=active('draw1')?Math.min(hs(S.players.length),h.length+1):hs(S.players.length);
 while(h.length<lim&&S.deck.length)h.push(S.deck.pop());
 if(allEmpty()){S.status='won';return}
 S.tn++;let k=0;
 do{S.turn=(S.turn+1)%S.players.length;k++}while(!S.hands[cur().id].length&&k<=S.players.length);
 Object.assign(S,{played:0,sp:null,three:0,stopped:0});
 if(stuck())lose(cur().name+' non può giocare il minimo di carte.')}
function botStep(){
 const h=S.hands[cur().id];let b=null;
 h.forEach((c,i)=>S.piles.forEach((p,pi)=>{if(!legal(pi,c))return;let k;
  if(c.j)k=30;else if(c.r!=null)k=-4-(p.u?p.t-c.r:c.r+9-p.t);
  else{k=(p.u?c.v===p.t-10:c.v===p.t+10)?-10:Math.abs(c.v-p.t);
   if(c.f)k+=12;if(c.x==='skull')k+=40;else if(c.x==='three')k+=25;else if(c.x==='stop')k+=8;else if(c.x)k+=6}
  if(p.f===S.tn||p.m)k-=200;
  if(!b||k<b.k)b={i,pi,k}}));
 if(b&&(S.played<need()||b.k<=2))play(b.i,b.pi);else endTurn()}

const view=(g,pid)=>({code:g.code,host:g.host,status:g.status,opt:g.opt,players:g.players,v:g.v,turn:g.turn,tn:g.tn,played:g.played,sp:g.sp,three:g.three,stopped:g.stopped,piles:g.piles,log:g.log,msg:g.msg,
 deck:g.deck?g.deck.map(()=>0):[],hands:g.hands?Object.fromEntries(g.players.map(p=>[p.id,p.id===pid?g.hands[p.id]:g.hands[p.id].map(()=>0)])):{}});
const send=(ws,o)=>{if(ws.readyState===1)ws.send(JSON.stringify(o))};
function broadcast(g){g.v++;g.ts=Date.now();for(const [pid,ws] of Object.entries(g.conn))send(ws,{t:'state',s:view(g,pid)})}
function tick(g){
 if(g.timer||g.status!=='play'||!g.players[g.turn].bot)return;
 g.timer=setTimeout(()=>{g.timer=null;S=g;if(g.status==='play'&&cur().bot){botStep();broadcast(g);tick(g)}},900)}
const clean=s=>String(s||'Giocatore').replace(/[<>&"]/g,'').trim().slice(0,14)||'Giocatore';
function handle(ws,m){
 const pid=String(m.pid||'').slice(0,20);if(!pid)return;
 if(m.t==='create'){
  let code;do{code=[...Array(4)].map(()=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random()*24|0]).join('')}while(games[code]);
  const o=m.opt||{},n=Math.max(0,Math.min(4,+m.bots||0));
  const g=games[code]={code,host:pid,status:'lobby',v:1,ts:Date.now(),opt:{fire:!!o.fire,ext:!!o.ext,joker:!!o.joker,tens:!!o.tens},players:[{id:pid,name:clean(m.name)}],conn:{}};
  for(let i=1;i<=n;i++)g.players.push({id:'bot'+i,name:'CPU '+i,bot:1});
  g.conn[pid]=ws;ws.pid=pid;return broadcast(g)}
 const g=games[String(m.code||'').toUpperCase()]||games[ws.code];
 if(m.t==='join'){
  const gg=games[String(m.code||'').toUpperCase()];
  if(!gg)return send(ws,{t:'err',m:'Partita non trovata.'});
  if(!gg.players.some(p=>p.id===pid)){
   if(gg.status!=='lobby')return send(ws,{t:'err',m:'Partita già iniziata.'});
   if(gg.players.length>=5)return send(ws,{t:'err',m:'Partita piena.'});
   gg.players.push({id:pid,name:clean(m.name)})}
  gg.conn[pid]=ws;ws.pid=pid;ws.code=gg.code;return broadcast(gg),tick(gg)}
 const gm=Object.values(games).find(x=>x.conn[pid]===ws);if(!gm)return;S=gm;
 if(m.t==='leave'){delete gm.conn[pid];if(gm.status==='lobby'&&gm.host!==pid)gm.players=gm.players.filter(p=>p.id!==pid);return broadcast(gm)}
 if(m.t==='start'&&gm.host===pid&&gm.status==='lobby')start();
 else if(gm.status==='play'&&cur().id===pid){
  if(m.t==='play'){const h=S.hands[pid],i=+m.i,pi=+m.pi;
   if(h[i]&&S.piles[pi]&&legal(pi,h[i]))play(i,pi)}
  else if(m.t==='end'&&(S.played>=need()||S.stopped))endTurn()}
 else return;
 broadcast(gm);tick(gm)}
const srv=http.createServer((q,r)=>{
 if(q.url==='/health'){r.end('ok');return}
 r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end(fs.readFileSync(path.join(__dirname,'public','index.html')))});
const wss=new WebSocketServer({server:srv});
wss.on('connection',ws=>{
 ws.alive=true;ws.on('pong',()=>ws.alive=true);
 ws.on('message',raw=>{let m;try{m=JSON.parse(raw)}catch(e){return}
  try{handle(ws,m)}catch(e){console.error(e);send(ws,{t:'err',m:'Errore del server.'})}})});
setInterval(()=>{wss.clients.forEach(w=>{if(!w.alive)return w.terminate();w.alive=false;w.ping()})},30000);
setInterval(()=>{for(const c in games)if(Date.now()-games[c].ts>6*3600e3)delete games[c]},600000);
srv.listen(PORT,()=>console.log('The Game server su porta '+PORT));
