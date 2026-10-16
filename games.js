/* Poppylap arcade games: Neon Flight + Mushroom Run
   Shared shell (lifecycle, input, pause, countdown, results) + two game definitions.
   Physics runs on a fixed timestep so speed is identical on 60Hz and 144Hz screens. */
(function(){
'use strict';
const W=960,H=540,STEP=1/120;
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pick=a=>a[Math.floor(Math.random()*a.length)];

/* ---------- persistence ---------- */
let bests={};try{bests=JSON.parse(localStorage.getItem('pl2-best')||'{}')}catch(e){}
let muted=false;try{muted=localStorage.getItem('pl2-muted')==='1'}catch(e){}

/* ---------- audio ---------- */
let actx=null;
function beep(freq,dur,type,vol,slide){
  if(muted)return;
  try{
    actx=actx||new(window.AudioContext||window.webkitAudioContext)();
    if(actx.state==='suspended')actx.resume();
    const t=actx.currentTime,o=actx.createOscillator(),g=actx.createGain();
    o.type=type||'square';o.frequency.setValueAtTime(freq,t);
    if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(40,freq+slide),t+dur);
    g.gain.setValueAtTime(vol||.04,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(actx.destination);o.start(t);o.stop(t+dur);
  }catch(e){}
}

/* ---------- shared drawing helpers ---------- */
function burst(arr,x,y,n,o){
  if(arr.length>260)arr.splice(0,n);
  for(let i=0;i<n;i++){
    const a=rand(0,6.283),s=rand(o.min||40,o.max||240);
    arr.push({x,y,vx:Math.cos(a)*s+(o.vx||0),vy:Math.sin(a)*s+(o.vy||0),life:rand(.35,.8)*(o.life||1),
      c:o.colors[i%o.colors.length],s:rand(o.sMin||2,o.sMax||5),g:o.g||0});
  }
}
function stepParts(arr,dt){
  for(let i=arr.length-1;i>=0;i--){
    const p=arr[i];p.life-=dt;
    if(p.life<=0){arr.splice(i,1);continue}
    p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
  }
}
function drawParts(ctx,arr){
  for(const p of arr){ctx.globalAlpha=clamp(p.life*2.2,0,1);ctx.fillStyle=p.c;ctx.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s)}
  ctx.globalAlpha=1;
}
function stepPops(arr,dt){for(let i=arr.length-1;i>=0;i--){const p=arr[i];p.life-=dt;p.y-=40*dt;if(p.life<=0)arr.splice(i,1)}}
function drawPops(ctx,arr){
  ctx.save();ctx.textAlign='center';ctx.font='900 26px "Barlow Condensed",sans-serif';
  for(const p of arr){ctx.globalAlpha=clamp(p.life*2,0,1);ctx.fillStyle=p.c||'#fff';ctx.fillText(p.t,p.x,p.y)}
  ctx.restore();
}
function circleRect(cx,cy,r,rx,ry,rw,rh){
  const dx=cx-clamp(cx,rx,rx+rw),dy=cy-clamp(cy,ry,ry+rh);return dx*dx+dy*dy<r*r;
}
function glowSprite(r,color){
  const c=document.createElement('canvas');c.width=c.height=r*2;
  const x=c.getContext('2d'),g=x.createRadialGradient(r,r,0,r,r,r);
  g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,r*2,r*2);return c;
}
/* pre-rendered skyline strip that tiles horizontally */
function skyline(n,minW,maxW,minH,maxH,body,win,seedLit){
  const bs=[];let L=0;
  for(let i=0;i<n;i++){const w=Math.round(rand(minW,maxW));bs.push({x:L,w,h:Math.round(rand(minH,maxH))});L+=w+Math.round(rand(0,10))}
  const c=document.createElement('canvas');c.width=L;c.height=maxH;const x=c.getContext('2d');
  for(const b of bs){
    x.fillStyle=body;x.fillRect(b.x,maxH-b.h,b.w,b.h);
    if(win){x.fillStyle=win;for(let yy=maxH-b.h+12;yy<maxH-10;yy+=20)for(let xx=b.x+8;xx<b.x+b.w-10;xx+=16)if(Math.random()<seedLit)x.fillRect(xx,yy,6,9)}
  }
  return{c,L,h:maxH};
}
function drawSkyline(ctx,s,scroll,baseY){
  const off=((scroll%s.L)+s.L)%s.L;
  ctx.drawImage(s.c,-off,baseY-s.h);
  if(s.L-off<W)ctx.drawImage(s.c,s.L-off,baseY-s.h);
  if(s.L<W)ctx.drawImage(s.c,2*s.L-off,baseY-s.h);
}

/* ---------- assets ---------- */
function dogSVG(){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 82" width="90" height="74"><defs><linearGradient id="fur" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffca78"/><stop offset="1" stop-color="#d96d32"/></linearGradient><linearGradient id="cream" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff2d4"/><stop offset="1" stop-color="#e9c9a0"/></linearGradient></defs><path d="M23 30 L17 5 Q16 0 24 7 L40 19 Q51 14 62 19 L77 5 Q83 1 81 11 L78 31 Q89 45 77 58 Q66 70 48 66 Q28 65 21 50 Q17 40 23 30Z" fill="url(#fur)" stroke="#8d431f" stroke-width="2"/><path d="M25 27 L23 11 L37 24Z M76 26 L78 11 L65 24Z" fill="#f4a45a"/><path d="M26 39 Q32 30 43 37 L49 46 L55 37 Q67 31 75 41 Q73 56 60 59 Q50 64 39 57 Q28 53 26 39Z" fill="url(#cream)"/><ellipse cx="39" cy="36" rx="3.5" ry="4.2" fill="#19121b"/><ellipse cx="64" cy="36" rx="3.5" ry="4.2" fill="#19121b"/><circle cx="40" cy="35" r="1" fill="white"/><circle cx="65" cy="35" r="1" fill="white"/><path d="M46 46 Q51 42 56 46 Q55 51 51 51 Q47 51 46 46Z" fill="#21151b"/><path d="M51 51 Q47 56 43 53 M51 51 Q55 56 59 53" fill="none" stroke="#75432d" stroke-width="1.6" stroke-linecap="round"/><path d="M23 48 Q15 42 14 51 Q15 62 28 60" fill="none" stroke="#d96d32" stroke-width="7" stroke-linecap="round"/></svg>`}
const dogImg=new Image();dogImg.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(dogSVG());
const cityImg=new Image();cityImg.src='assets/cyberpunk-city.png';

const GAMES={};

/* =====================================================================
   NEON FLIGHT
   ===================================================================== */
GAMES.neon={
  key:'neon',title:'NEON FLIGHT',mode:'ARCADE',tag:'✳ NIGHT CITY',medals:[5,15,30],
  controls:'SPACE / CLICK / TAP TO FLAP',
  intro:{kicker:'POPPYLAP ORIGINAL / 001',h:'NEON<br><span style="color:#bd5cff">FLIGHT</span>',
    p:'Guide your Shiba through the neon skyline. Tap, click or press SPACE to flap. Gaps tighten and towers start to drift as your score climbs.'},
  create(api,ctx){
    const PW=72,FLOOR=H-60,R=17;
    const far=skyline(26,50,100,110,230,'#120c26','#3a2a66',.25),near=skyline(20,70,130,70,160,'#0b0818','#ffcf6a',.18);
    const skyGrad=ctx.createLinearGradient(0,0,0,H);skyGrad.addColorStop(0,'#150f3a');skyGrad.addColorStop(.7,'#3a1458');skyGrad.addColorStop(1,'#a8305f');
    const shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,'rgba(5,6,10,.32)');shade.addColorStop(.65,'rgba(5,6,10,.08)');shade.addColorStop(1,'rgba(5,6,10,.9)');
    const pg=ctx.createLinearGradient(0,0,PW,0);
    pg.addColorStop(0,'#0a1722');pg.addColorStop(.22,'#1b3347');pg.addColorStop(.5,'#0e111b');pg.addColorStop(.82,'#2a1020');pg.addColorStop(1,'#080b13');
    const glow=glowSprite(60,'rgba(170,70,255,.55)');
    let g;
    function pipeCy(p){return p.cy+Math.sin(g.t*1.7+p.ph)*p.amp}
    function spawnPipe(x){
      const gap=Math.max(136,178-g.score*1.5),m=82;
      const moving=g.score>=10&&Math.random()<.55;
      g.pipes.push({x,gap,cy:rand(m+gap/2,FLOOR-m-gap/2),amp:moving?rand(18,38):0,ph:rand(0,6.28),passed:false});
    }
    function reset(){
      g={t:0,scroll:0,score:0,speed:200,bird:{x:230,y:H/2,vy:0,rot:0},pipes:[],parts:[],pops:[],
         shake:0,flash:0,dead:false,idle:true,trail:0};
      spawnPipe(760);
    }
    function die(){
      if(g.dead)return;g.dead=true;g.shake=.45;g.flash=.25;
      burst(g.parts,g.bird.x,g.bird.y,34,{colors:['#ffb15c','#ff4fd8','#57f4ff','#fff'],min:80,max:340,g:500,sMax:6});
      beep(150,.4,'sawtooth',.07,-110);
      api.end(g.score);
    }
    function flap(){
      if(g.dead||g.idle)return;
      g.bird.vy=-405;
      burst(g.parts,g.bird.x-14,g.bird.y+10,5,{colors:['#57f4ff','#bd5cff'],min:20,max:90,vy:70,life:.6,sMax:4});
      beep(540,.08,'triangle',.05,220);
    }
    function update(dt){
      g.t+=dt;g.shake=Math.max(0,g.shake-dt);g.flash=Math.max(0,g.flash-dt);
      stepParts(g.parts,dt);stepPops(g.pops,dt);
      const b=g.bird;
      if(g.dead){ // body tumbles to the floor
        b.vy=Math.min(b.vy+1500*dt,800);b.y=Math.min(FLOOR-R,b.y+b.vy*dt);b.rot+=dt*5;return;
      }
      g.speed=200+Math.min(125,g.score*5);g.scroll+=g.speed*dt;
      b.vy=Math.min(b.vy+1250*dt,700);b.y+=b.vy*dt;
      if(b.y<R){b.y=R;if(b.vy<0)b.vy=0}
      b.rot+=(clamp(b.vy*.0018,-.45,.95)-b.rot)*Math.min(1,dt*12);
      g.trail-=dt;if(g.trail<=0){g.trail=.035;g.parts.push({x:b.x-20,y:b.y+rand(-6,6),vx:-g.speed*.6,vy:rand(-15,15),life:.35,c:Math.random()<.5?'#57f4ff':'#bd5cff',s:rand(2,4),g:0})}
      for(const p of g.pipes){
        p.x-=g.speed*dt;
        if(!p.passed&&p.x+PW<b.x){
          p.passed=true;g.score++;api.setScore(g.score);
          g.pops.push({x:b.x,y:b.y-30,t:'+1',life:.7,c:'#9bf7ff'});
          burst(g.parts,b.x,b.y,8,{colors:['#9bf7ff','#fff'],min:30,max:120,life:.6});
          beep(620+Math.min(g.score,25)*14,.09,'square',.04);
        }
      }
      const last=g.pipes[g.pipes.length-1];
      if(!last||last.x<W-300)spawnPipe(W+60);
      g.pipes=g.pipes.filter(p=>p.x>-PW-30);
      if(b.y+R>FLOOR){b.y=FLOOR-R;die();return}
      for(const p of g.pipes){
        const cy=pipeCy(p);
        if(circleRect(b.x,b.y,R,p.x,-50,PW,cy-p.gap/2+50)||circleRect(b.x,b.y,R,p.x,cy+p.gap/2,PW,FLOOR-(cy+p.gap/2))){die();return}
      }
    }
    function idle(dt){g.t+=dt;g.scroll+=70*dt;g.bird.y=H/2+Math.sin(g.t*3)*9;g.bird.rot=Math.sin(g.t*3)*.12;stepParts(g.parts,dt)}
    function drawPipe(x,topH,botY){
      ctx.save();ctx.translate(x,0);
      ctx.fillStyle=pg;ctx.strokeStyle='#e5dff4';ctx.lineWidth=2;
      ctx.fillRect(0,0,PW,topH);ctx.strokeRect(1,0,PW-2,topH);
      ctx.fillRect(0,botY,PW,FLOOR-botY);ctx.strokeRect(1,botY,PW-2,FLOOR-botY);
      ctx.fillStyle='#11b9c9';ctx.fillRect(-5,topH-12,PW+10,12);ctx.fillRect(-5,botY,PW+10,12);
      ctx.fillStyle='rgba(87,244,255,.35)';ctx.fillRect(-5,topH-3,PW+10,3);ctx.fillRect(-5,botY+12,PW+10,3);
      ctx.fillStyle='#fa365f';ctx.fillRect(8,Math.max(0,topH-78),5,54);ctx.fillRect(8,botY+26,5,54);
      ctx.fillStyle='#ffb3d0';ctx.fillRect(8,Math.max(0,topH-78),5,4);ctx.fillRect(8,botY+26,5,4);
      ctx.fillStyle='#2c3949';
      for(let y=18;y<topH-18;y+=28){ctx.fillRect(22,y,34,2);ctx.fillRect(22,y+6,20,2)}
      for(let y=botY+28;y<FLOOR-6;y+=28){ctx.fillRect(22,y,34,2);ctx.fillRect(22,y+6,20,2)}
      ctx.restore();
    }
    function draw(){
      ctx.save();
      if(g.shake>0)ctx.translate(rand(-1,1)*g.shake*20,rand(-1,1)*g.shake*20);
      if(cityImg.naturalWidth){
        const sc=Math.max(W/cityImg.width,H/cityImg.height),bw=cityImg.width*sc,bh=cityImg.height*sc;
        ctx.drawImage(cityImg,(W-bw)/2+Math.sin(g.t*.3)*9,(H-bh)/2,bw,bh);
      }else{
        ctx.fillStyle=skyGrad;ctx.fillRect(-30,-30,W+60,H+60);
        drawSkyline(ctx,far,g.scroll*.12,FLOOR);drawSkyline(ctx,near,g.scroll*.3,FLOOR);
      }
      ctx.fillStyle=shade;ctx.fillRect(-30,-30,W+60,H+60);
      ctx.lineWidth=1;
      for(let k=0;k<2;k++){
        ctx.strokeStyle=k?'rgba(255,73,120,.4)':'rgba(117,234,255,.35)';ctx.beginPath();
        for(let i=k;i<64;i+=2){
          const x=(((i*137-g.t*(110+(i%3)*35))%W)+W)%W,y=((i*83+g.t*(380+(i%4)*60))%H+H)%H;
          ctx.moveTo(x,y);ctx.lineTo(x-3,y+11);
        }
        ctx.stroke();
      }
      ctx.fillStyle='#080910';ctx.fillRect(-30,FLOOR,W+60,60+30);
      ctx.fillStyle='#a52cff';ctx.fillRect(-30,FLOOR-3,W+60,3);ctx.fillStyle='#29eaff';ctx.fillRect(-30,FLOOR,W+60,1);
      for(let x=-(g.scroll%92);x<W;x+=92){ctx.fillStyle='#3f1762';ctx.fillRect(x,FLOOR+12,45,3);ctx.fillStyle='#152c3b';ctx.fillRect(x+52,FLOOR+15,12,7)}
      for(const p of g.pipes){const cy=pipeCy(p);drawPipe(p.x,cy-p.gap/2,cy+p.gap/2)}
      drawParts(ctx,g.parts);
      const b=g.bird;
      ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.rot);
      ctx.drawImage(glow,-60,-60,120,120);
      if(dogImg.complete&&dogImg.naturalWidth)ctx.drawImage(dogImg,-35,-31,70,62);
      else{ctx.fillStyle='#f7ad57';ctx.beginPath();ctx.arc(0,0,22,0,6.283);ctx.fill()}
      ctx.restore();
      drawPops(ctx,g.pops);
      ctx.fillStyle='rgba(226,215,242,.85)';ctx.font='11px monospace';ctx.textAlign='left';ctx.fillText('NIGHT CITY / DISTRICT 07',18,H-22);
      ctx.fillStyle='#5af5ff';ctx.textAlign='right';ctx.fillText('POPPYLAP ARCADE',W-18,H-22);ctx.textAlign='left';
      ctx.restore();
      if(g.flash>0){ctx.fillStyle='rgba(255,255,255,'+(g.flash*1.6)+')';ctx.fillRect(0,0,W,H)}
    }
    return{reset,update,idle,draw,begin(){g.idle=false},input(d){if(d)flap()}};
  }
};

/* =====================================================================
   MUSHROOM RUN  (endless runner: variable jump, coyote time, pits, blocks, bats, coins)
   ===================================================================== */
GAMES.run={
  key:'run',title:'MUSHROOM RUN',mode:'ENDLESS RUNNER',tag:'🍄 MUSHROOM RUN',medals:[60,150,300],
  controls:'HOLD SPACE / TAP FOR A HIGHER JUMP',
  intro:{kicker:'POPPYLAP ARCADE / 002',h:'MUSHROOM<br><span style="color:#bd5cff">RUN</span>',
    p:'An endless sprint across the rooftops. Hold jump for height, hop pits, land on blocks, dodge bats and grab coins. The longer you last, the faster it gets.'},
  create(api,ctx){
    const GY=440,PX=150,PWD=34,PH=44;
    const far=skyline(24,60,110,90,190,'#251847','#4a3a7a',.2),near=skyline(18,80,140,60,150,'#1b1236','#ffc65c',.15);
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#17103a');sky.addColorStop(.62,'#54205d');sky.addColorStop(1,'#ef8b6b');
    const sun=glowSprite(110,'rgba(255,170,120,.55)');
    const stars=Array.from({length:40},()=>({x:rand(0,W),y:rand(0,260),s:rand(1,2.2),p:rand(0,6)}));
    let g;
    function reset(){
      g={t:0,bg:0,dist:0,speed:380,score:0,coins:0,next:620,dead:false,idle:true,shake:0,rot:0,dust:0,
         p:{y:GY,vy:0,grounded:true,coyote:.09,buffer:0,jumping:false,phase:0,squash:0},
         blocks:[],pits:[],bats:[],coinsA:[],parts:[],pops:[],
         clouds:[{x:180,y:90,s:1},{x:520,y:140,s:.8},{x:830,y:70,s:1.2}]};
    }
    function coinArc(cx,baseY,n){
      for(let i=0;i<n;i++)g.coinsA.push({x:cx+(i-(n-1)/2)*38,y:baseY-Math.sin(Math.PI*(i+.5)/n)*46,ph:rand(0,6)});
    }
    function spawn(){
      const sx=W+80,r=Math.random();let w=40,kind=g.dist<1600?'block':(r<.46?'block':r<.72?'pit':r<.88?'bat':'double');
      if(kind==='block'){
        w=Math.round(rand(36,52));const h=pick([40,56,72,90]);g.blocks.push({x:sx,w,h});
        if(Math.random()<.7)coinArc(sx+w/2,GY-h-34,4);
      }else if(kind==='pit'){
        w=Math.round(rand(120,Math.min(215,120+g.speed*.17)));g.pits.push({x:sx,w});
        if(Math.random()<.8)coinArc(sx+w/2,GY-70,5);
      }else if(kind==='bat'){
        g.bats.push({x:sx,y:GY-rand(62,78),ph:rand(0,6)});
      }else{
        g.blocks.push({x:sx,w:40,h:48});g.blocks.push({x:sx+230,w:40,h:48});w=270;coinArc(sx+135,GY-72,4);
      }
      g.next=g.dist+w+g.speed*.62+rand(60,250);
    }
    function overPit(){const cx=PX+PWD/2;return g.pits.some(q=>cx>q.x&&cx<q.x+q.w)}
    function die(){
      if(g.dead)return;g.dead=true;g.shake=.45;g.p.vy=-520;
      burst(g.parts,PX+PWD/2,g.p.y-22,30,{colors:['#ff5252','#fff','#ffcc63','#bd5cff'],min:80,max:320,g:600,sMax:6});
      beep(170,.45,'sawtooth',.07,-120);api.end(g.score);
    }
    function jump(){
      const p=g.p;p.vy=-860;p.grounded=false;p.coyote=0;p.buffer=0;p.jumping=true;p.squash=-.22;
      burst(g.parts,PX+PWD/2,p.y,6,{colors:['#d9c3ff','#fff'],min:30,max:110,vy:-20,g:300,sMax:4});
      beep(420,.14,'square',.045,260);
    }
    function update(dt){
      g.t+=dt;g.shake=Math.max(0,g.shake-dt);const p=g.p;
      stepParts(g.parts,dt);stepPops(g.pops,dt);
      if(g.dead){p.vy=Math.min(p.vy+2600*dt,1200);p.y+=p.vy*dt;g.rot+=dt*9;return}
      g.speed=Math.min(640,380+g.dist/90);
      const dx=g.speed*dt;g.dist+=dx;
      for(const o of g.blocks)o.x-=dx;for(const o of g.pits)o.x-=dx;for(const o of g.coinsA)o.x-=dx;for(const o of g.bats)o.x-=dx*1.18;
      g.blocks=g.blocks.filter(o=>o.x+o.w>-60);g.pits=g.pits.filter(o=>o.x+o.w>-60);g.coinsA=g.coinsA.filter(o=>o.x>-60);g.bats=g.bats.filter(o=>o.x>-60);
      if(g.dist>=g.next)spawn();
      /* jump logic: buffer + coyote */
      p.buffer=Math.max(0,p.buffer-dt);
      if(p.grounded)p.coyote=.09;else p.coyote=Math.max(0,p.coyote-dt);
      if(p.buffer>0&&(p.grounded||p.coyote>0))jump();
      const prev=p.y;
      p.vy=Math.min(p.vy+2600*dt*(p.vy>0?1.25:1),1150);p.y+=p.vy*dt;
      /* landing on ground / block tops */
      const l=PX+6,r=PX+PWD-6;let floor=null;
      if(!overPit()&&prev<=GY+1&&p.y>=GY&&p.vy>=0)floor=GY;
      for(const o of g.blocks){
        if(r>o.x&&l<o.x+o.w){const top=GY-o.h;if(prev<=top+6&&p.y>=top&&p.vy>=0&&(floor===null||top<floor))floor=top}
      }
      const was=p.grounded;
      if(floor!==null){
        if(!was&&p.vy>240){p.squash=.28;burst(g.parts,PX+PWD/2,floor,6,{colors:['#d9c3ff','#8e43c7'],min:30,max:120,vy:-30,g:300,sMax:4})}
        p.y=floor;p.vy=0;p.grounded=true;p.jumping=false;
      }else p.grounded=false;
      /* hit a block from the side/bottom */
      for(const o of g.blocks){
        if(r>o.x&&l<o.x+o.w&&p.y-2>GY-o.h&&p.y-PH+4<GY){die();return}
      }
      for(const b of g.bats){
        if(r>b.x-16&&l<b.x+16&&p.y-2>b.y-10&&p.y-PH+4<b.y+10){die();return}
      }
      if(p.y>H+40){die();return}
      for(const c of g.coinsA){
        if(c.got)continue;
        const ddx=c.x-(PX+PWD/2),ddy=c.y-(p.y-22);
        if(ddx*ddx+ddy*ddy<28*28){
          c.got=true;g.coins++;g.pops.push({x:c.x,y:c.y-10,t:'+5',life:.6,c:'#ffd76a'});
          burst(g.parts,c.x,c.y,6,{colors:['#ffd76a','#fff'],min:30,max:120,life:.6});
          beep(880,.07,'square',.04,300);
        }
      }
      g.coinsA=g.coinsA.filter(c=>!c.got);
      p.phase+=dt*g.speed*.022;p.squash*=Math.pow(.0008,dt);
      g.dust-=dt;if(p.grounded&&g.dust<=0){g.dust=.07;g.parts.push({x:PX+6,y:p.y-2,vx:-g.speed*.35,vy:rand(-50,-10),life:.3,c:'#cfb4ee',s:rand(2,4),g:0})}
      const sc=Math.floor(g.dist/60)+g.coins*5;
      if(sc!==g.score){g.score=sc;api.setScore(sc)}
      api.setSub('🍄 MUSHROOM RUN · ★ '+g.coins);
    }
    function idle(dt){g.t+=dt;g.bg+=70*dt;g.p.phase+=dt*3;for(const c of g.clouds){c.x-=8*dt;if(c.x<-80)c.x=W+80}stepParts(g.parts,dt)}
    function drawMushroom(x,y,phase,sq,airborne,rot){
      ctx.save();ctx.translate(x+PWD/2,y);ctx.rotate(rot);ctx.scale(1-sq*.5,1+sq);
      const lg=airborne?0:Math.sin(phase)*5;
      ctx.fillStyle='#3b2a55';
      ctx.fillRect(-10,-7,8,7+(airborne?-2:Math.max(0,-lg)*.3));ctx.fillRect(2,-7,8,7+(airborne?-2:Math.max(0,lg)*.3));
      ctx.fillStyle='#f8e7d1';ctx.beginPath();ctx.roundRect?ctx.roundRect(-11,-26,22,21,6):ctx.rect(-11,-26,22,21);ctx.fill();
      ctx.fillStyle='#e04545';ctx.beginPath();ctx.moveTo(-19,-22);ctx.quadraticCurveTo(-19,-46,0,-46);ctx.quadraticCurveTo(19,-46,19,-22);ctx.closePath();ctx.fill();
      ctx.fillStyle='#b92f3a';ctx.fillRect(-19,-24,38,4);
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-9,-35,4.5,0,6.283);ctx.arc(7,-40,4,0,6.283);ctx.arc(12,-30,3.2,0,6.283);ctx.fill();
      ctx.fillStyle='#1a1228';ctx.fillRect(-6,-18,3.5,6);ctx.fillRect(3,-18,3.5,6);
      ctx.fillStyle='#fff';ctx.fillRect(-5,-18,1.4,2);ctx.fillRect(4,-18,1.4,2);
      ctx.restore();
    }
    function draw(){
      ctx.save();
      if(g.shake>0)ctx.translate(rand(-1,1)*g.shake*20,rand(-1,1)*g.shake*20);
      ctx.fillStyle=sky;ctx.fillRect(-30,-30,W+60,H+60);
      for(const s of stars){ctx.globalAlpha=.4+.5*Math.abs(Math.sin(g.t*1.4+s.p));ctx.fillStyle='#fff';ctx.fillRect(s.x,s.y,s.s,s.s)}ctx.globalAlpha=1;
      ctx.drawImage(sun,650,40,220,220);
      for(const c of g.clouds){ctx.fillStyle='rgba(243,217,255,.2)';ctx.beginPath();ctx.ellipse(c.x,c.y,48*c.s,15*c.s,0,0,6.283);ctx.ellipse(c.x+22*c.s,c.y-8*c.s,30*c.s,16*c.s,0,0,6.283);ctx.fill()}
      const sc=g.dist+g.bg;
      drawSkyline(ctx,far,sc*.1,GY);drawSkyline(ctx,near,sc*.28,GY);
      ctx.fillStyle='#39214b';ctx.fillRect(-30,GY,W+60,H-GY+30);
      ctx.fillStyle='#8bffb0';ctx.fillRect(-30,GY-3,W+60,6);
      for(let x=-(sc%64);x<W;x+=64){ctx.fillStyle='#5a3765';ctx.fillRect(x,GY+22,32,7);ctx.fillStyle='#251832';ctx.fillRect(x+34,GY+46,18,5)}
      for(const q of g.pits){
        ctx.fillStyle='#07040d';ctx.fillRect(q.x,GY-4,q.w,H-GY+34);
        ctx.fillStyle='#8bffb0';ctx.fillRect(q.x-3,GY-3,3,8);ctx.fillRect(q.x+q.w,GY-3,3,8);
        ctx.fillStyle='rgba(189,92,255,.25)';ctx.fillRect(q.x,H-40,q.w,40);
      }
      for(const o of g.blocks){
        const y=GY-o.h;
        ctx.fillStyle='#2a1040';ctx.fillRect(o.x-1,y-1,o.w+2,o.h+1);
        ctx.fillStyle='#7a35b8';ctx.fillRect(o.x+3,y+12,o.w-6,o.h-12);
        ctx.fillStyle='#b565f0';ctx.fillRect(o.x+6,y+12,5,o.h-12);
        ctx.fillStyle='#d490ff';ctx.fillRect(o.x,y,o.w,12);
        ctx.fillStyle='#f0c8ff';ctx.fillRect(o.x,y,o.w,3);
      }
      for(const b of g.bats){
        const fl=Math.sin(g.t*18+b.ph)*10;
        ctx.fillStyle='#2b1844';ctx.beginPath();ctx.ellipse(b.x,b.y,11,9,0,0,6.283);ctx.fill();
        ctx.beginPath();ctx.moveTo(b.x-6,b.y-2);ctx.lineTo(b.x-30,b.y-6-fl);ctx.lineTo(b.x-18,b.y+6);ctx.closePath();
        ctx.moveTo(b.x+6,b.y-2);ctx.lineTo(b.x+30,b.y-6-fl);ctx.lineTo(b.x+18,b.y+6);ctx.closePath();ctx.fill();
        ctx.fillStyle='#ff5a7a';ctx.fillRect(b.x-5,b.y-3,3,3);ctx.fillRect(b.x+2,b.y-3,3,3);
      }
      for(const c of g.coinsA){
        const w=Math.abs(Math.cos(g.t*5+c.ph))*9+1.5;
        ctx.fillStyle='#ffcf4a';ctx.beginPath();ctx.ellipse(c.x,c.y+Math.sin(g.t*3+c.ph)*2,w,9,0,0,6.283);ctx.fill();
        ctx.fillStyle='#fff3b0';ctx.fillRect(c.x-1,c.y-5,2,5);
      }
      drawParts(ctx,g.parts);
      const p=g.p;
      drawMushroom(PX,p.y,p.phase,p.squash,!p.grounded&&!g.idle,g.dead?g.rot:0);
      drawPops(ctx,g.pops);
      ctx.fillStyle='rgba(255,255,255,.8)';ctx.font='11px monospace';ctx.textAlign='left';ctx.fillText('RUN '+String(Math.floor(g.dist/10)).padStart(5,'0')+' M',20,H-18);
      ctx.restore();
    }
    return{reset,update,idle,draw,begin(){g.idle=false},
      input(d){
        const p=g.p;if(g.dead||g.idle)return;
        if(d){p.buffer=.12;if(p.grounded||p.coyote>0){/* handled on next step */}}
        else if(p.jumping&&p.vy<-330)p.vy=-330; // release early = short hop
      }};
  }
};

/* =====================================================================
   SHELL
   ===================================================================== */
let S=null;
function teardown(){
  if(!S)return;
  cancelAnimationFrame(S.raf);S.timers.forEach(clearTimeout);
  S.handlers.forEach(h=>h[0].removeEventListener(h[1],h[2]));
  S=null;
}
let adTimer=0;
function clearAd(){if(adTimer){clearInterval(adTimer);adTimer=0}}
window.teardownGame=function(){clearAd();teardown()};

/* 5-second ad break shown before a run and before every retry */
function showAd(t,onDone){
  clearAd();teardown();
  const SECS=5;
  openModal(`${modalHead('ADVERTISEMENT')}<div class="modal-body"><div class="ad-screen">
    <img class="ad-logo" src="assets/poppylap-logo.png" alt="">
    <div class="ad-tag">SPONSORED</div>
    <h2>POWER YOUR NEXT RUN</h2>
    <p>Your sponsor message plays here. Your run begins as soon as the ad ends.</p>
    <div class="ad-bar"><i id="adFill"></i></div>
    <div class="ad-count" id="adCount">Your run starts in ${SECS}s</div>
    <button class="btn btn-primary" id="adGo" type="button" disabled>PLAY NOW ↗</button>
  </div></div>`);
  const t0=performance.now(),fill=$('#adFill'),cnt=$('#adCount'),go=$('#adGo');
  const tick=()=>{
    const left=Math.max(0,SECS-(performance.now()-t0)/1000);
    fill.style.width=((1-left/SECS)*100)+'%';
    if(left>0){cnt.textContent='Your run starts in '+Math.ceil(left)+'s'}
    else{clearAd();cnt.textContent='Ad complete';go.disabled=false;go.onclick=()=>{go.onclick=null;onDone()};go.focus()}
  };
  tick();adTimer=setInterval(tick,100);
}
function retry(s){
  if(S!==s||s.state!=='over')return;
  const key=s.def.key,t=s.t;
  showAd(t,()=>launch(key,t,true));
}

function launch(key,t,auto){
  teardown();
  const def=GAMES[key]||GAMES.neon;
  openModal(`${modalHead(def.title+' / LIVE RUN')}<div class="modal-body">
    <div class="game-topline"><span>MISSION: <b>${esc(t.name)}</b></span><span>BEST: <b id="gBest">${bests[def.key]||0}</b></span><span>MODE: <b>${def.mode}</b></span><button class="snd-btn" id="gMute" type="button">${muted?'SOUND OFF':'SOUND ON'}</button></div>
    <div class="game-wrap"><canvas id="gCanvas" width="${W}" height="${H}"></canvas>
      <div class="game-hud"><span class="hud-pill">SCORE <b id="gScore">000</b></span><span class="hud-pill" id="gSub">${def.tag}</span></div>
      <div class="game-overlay" id="gOverlay"></div></div>
    <div class="game-instructions"><span><strong>${def.controls}</strong></span><span>P PAUSE · M SOUND</span><span>ESC TO CLOSE</span></div></div>`,'game-modal');
  const canvas=$('#gCanvas'),ctx=canvas.getContext('2d');
  const s=S={def,t,canvas,ctx,overlay:$('#gOverlay'),scoreEl:$('#gScore'),subEl:$('#gSub'),state:'ready',score:0,raf:0,last:0,acc:0,cd:0,dyingT:0,overAt:0,timers:[],handlers:[],game:null};
  const api={
    setScore(n){s.score=n;s.scoreEl.textContent=String(n).padStart(3,'0')},
    setSub(txt){if(s.subEl.textContent!==txt)s.subEl.textContent=txt},
    end(score){endRun(s,score)}
  };
  s.game=def.create(api,ctx);s.game.reset();
  const on=(el,ev,fn,opt)=>{el.addEventListener(ev,fn,opt);s.handlers.push([el,ev,fn])};
  const isJump=c=>c==='Space'||c==='ArrowUp'||c==='KeyW';
  on(canvas,'pointerdown',e=>{e.preventDefault();if(s.state==='playing')s.game.input(true)});
  on(canvas,'pointerup',()=>{if(s.state==='playing')s.game.input(false)});
  on(canvas,'pointercancel',()=>{if(s.state==='playing')s.game.input(false)});
  on(window,'keydown',e=>{
    if(!S||S!==s)return;
    if(isJump(e.code)){
      e.preventDefault();if(e.repeat)return;
      if(s.state==='playing')s.game.input(true);
      else if(s.state==='ready')start(s);
      else if(s.state==='over'&&performance.now()>s.overAt)retry(s);
      else if(s.state==='paused')resume(s);
    }else if(e.code==='KeyP'){
      if(s.state==='playing')pause(s);else if(s.state==='paused')resume(s);
    }else if(e.code==='KeyM')toggleMute();
  });
  on(window,'keyup',e=>{if(isJump(e.code)&&s.state==='playing')s.game.input(false)});
  on(document,'visibilitychange',()=>{if(document.hidden)pause(s)});
  on(window,'blur',()=>pause(s));
  $('#gMute').onclick=e=>{e.currentTarget.blur();toggleMute()};
  showIntro(s);
  s.raf=requestAnimationFrame(now=>loop(s,now));
  if(auto)start(s);
}
function toggleMute(){
  muted=!muted;try{localStorage.setItem('pl2-muted',muted?'1':'0')}catch(e){}
  const b=$('#gMute');if(b)b.textContent=muted?'SOUND OFF':'SOUND ON';
}
function setOverlay(s,html){s.overlay.classList.remove('hidden');s.overlay.innerHTML=html}
function hideOverlay(s){s.overlay.classList.add('hidden');s.overlay.innerHTML=''}
function showIntro(s){
  const i=s.def.intro;
  setOverlay(s,`<div><div class="run-label">${i.kicker}</div><h2>${i.h}</h2><p>${i.p}</p><button class="btn btn-primary" id="gStart" type="button">START RUN ↗</button></div>`);
  $('#gStart').onclick=()=>start(s);
}
function start(s){
  if(S!==s||(s.state!=='ready'&&s.state!=='over'))return;
  s.game.reset();s.score=0;s.scoreEl.textContent='000';
  s.state='countdown';s.cd=1.8;hideOverlay(s);
}
function pause(s){
  if(S!==s||s.state!=='playing')return;
  s.state='paused';s.game.input(false);
  setOverlay(s,`<div><div class="run-label">PAUSED</div><h2>TAKE A BREATH</h2><p>Press SPACE or tap resume when you are ready.</p><button class="btn btn-primary" id="gResume" type="button">RESUME ↗</button></div>`);
  $('#gResume').onclick=()=>resume(s);
}
function resume(s){
  if(S!==s||s.state!=='paused')return;
  s.state='countdown';s.cd=1.2;hideOverlay(s);
}
function endRun(s,score){
  if(S!==s||s.state==='dying'||s.state==='over')return;
  s.state='dying';s.dyingT=.85;s.final=score;
  const key=s.def.key,isBest=score>(bests[key]||0);
  if(isBest){bests[key]=score;try{localStorage.setItem('pl2-best',JSON.stringify(bests))}catch(e){}}
  s.isBest=isBest;
  player.entered=player.entered||[];
  s.firstEntry=!player.entered.includes(s.t.id);
  if(s.firstEntry){player.entered.push(s.t.id);player.played++;player.points+=10}
  if(score>0){player.history.unshift({name:s.t.name,score,date:new Date().toLocaleDateString()});player.history=player.history.slice(0,8)}
  save();renderProfile();
}
function showOver(s){
  s.state='over';s.overAt=performance.now()+550;
  const m=s.def.medals,sc=s.final,medal=sc>=m[2]?'GOLD RUN':sc>=m[1]?'SILVER RUN':sc>=m[0]?'BRONZE RUN':'KEEP GOING';
  const bestEl=$('#gBest');if(bestEl)bestEl.textContent=bests[s.def.key]||0;
  setOverlay(s,`<div><div class="run-label">${medal}</div><h2>${s.isBest&&sc>0?'NEW BEST':sc>0?'NICE RUN':'CRASHED OUT'}</h2>
    <p>Score <b style="color:#fff;font-size:22px">${sc}</b> · Best <b style="color:#fff">${bests[s.def.key]||0}</b><br>${s.firstEntry?'+10 participation points added to your player card.':'Saved to your player card.'}</p>
    <button class="btn btn-primary" id="gRetry" type="button" disabled>RUN IT BACK ↗</button><button class="btn btn-outline" id="gClose" type="button">CLOSE</button></div>`);
  $('#gClose').onclick=closeModal;
  s.timers.push(setTimeout(()=>{if(S===s){const b=$('#gRetry');if(b){b.disabled=false;b.onclick=()=>retry(s)}}},550));
}
function drawCountdown(s){
  const c=s.ctx,n=Math.max(1,Math.ceil(s.cd/.6)),ph=(s.cd%.6)/.6;
  c.save();c.fillStyle='rgba(8,6,16,.3)';c.fillRect(0,0,W,H);
  c.textAlign='center';c.textBaseline='middle';c.globalAlpha=.4+ph*.6;
  c.font='900 '+Math.round(110+(1-ph)*26)+'px "Barlow Condensed",sans-serif';
  c.fillStyle='#fff';c.shadowColor='#9500ff';c.shadowBlur=30;c.fillText(String(n),W/2,H/2);c.restore();
}
function loop(s,now){
  if(S!==s)return;
  s.raf=requestAnimationFrame(t=>loop(s,t));
  const dt=Math.min(.1,(now-(s.last||now))/1000);s.last=now;
  if(s.state==='countdown'){s.cd-=dt;s.game.idle(dt);if(s.cd<=0){s.state='playing';s.game.begin();s.acc=0}}
  else if(s.state==='ready')s.game.idle(dt);
  else if(s.state==='playing'||s.state==='dying'||s.state==='over'){
    s.acc+=dt;let n=0;
    while(s.acc>=STEP&&n<24){s.game.update(STEP);s.acc-=STEP;n++}
    if(n>=24)s.acc=0;
    if(s.state==='dying'){s.dyingT-=dt;if(s.dyingT<=0)showOver(s)}
  }
  s.game.draw();
  if(s.state==='countdown')drawCountdown(s);
}

window.startGame=function(t){
  if(!t||t.type!=='live'){toast('This mission is not live yet.');return}
  const key=/MUSHROOM|MARIO/i.test(t.game||'')?'run':'neon';
  showAd(t,()=>launch(key,t,true));
};
})();
