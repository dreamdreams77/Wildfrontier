import * as THREE from 'three';
import { rng, vnoise, fbm, smooth, mix, clamp01, hexToRgb, mixRgb } from './noise.js';

// Procedural hand-painted textures. Everything is drawn with visible brush strokes, soft colour drift and
// tileable wrap-around so surfaces read as painted rather than flat-shaded. Browser only (uses canvas).
export const canPaint=typeof document!=='undefined';
const cache=new Map();
let SCALE=1;export const setTextureScale=s=>{SCALE=s};
const cv=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
function toTex(canvas,{srgb=true,repeat=true,aniso=4}={}){
 const t=new THREE.CanvasTexture(canvas);if(srgb)t.colorSpace=THREE.SRGBColorSpace;
 if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping}t.anisotropy=aniso;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.needsUpdate=true;return t;
}
const rgb=(c,a=1)=>`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`;
const jitter=(c,r,n)=>[c[0]+(n-.5)*r,c[1]+(n-.5)*r*.9,c[2]+(n-.5)*r*.8];

// Brush strokes with optional wrap-around so the result tiles seamlessly.
function strokes(ctx,w,h,r,{colors,count,len=[6,16],width=[1.5,3.5],alpha=[.25,.6],angle=()=>r()*Math.PI*2,wrap=true}){
 ctx.lineCap='round';
 for(let i=0;i<count;i++){
  const x=r()*w,y=r()*h,a=angle(x,y,i),l=len[0]+r()*(len[1]-len[0]),lw=width[0]+r()*(width[1]-width[0]);
  const c=colors[(r()*colors.length)|0];ctx.strokeStyle=rgb(jitter(c,18,r()),alpha[0]+r()*(alpha[1]-alpha[0]));ctx.lineWidth=lw;
  const dx=Math.cos(a)*l,dy=Math.sin(a)*l;
  for(const ox of wrap?[-w,0,w]:[0])for(const oy of wrap?[-h,0,h]:[0]){
   if((ox&&(x+ox<-l||x+ox>w+l))||(oy&&(y+oy<-l||y+oy>h+l)))continue;
   ctx.beginPath();ctx.moveTo(x+ox,y+oy);ctx.lineTo(x+ox+dx,y+oy+dy);ctx.stroke();
  }
 }
}
function fillNoise(ctx,w,h,base,tint,scale,seed,amp=1){
 const id=ctx.getImageData(0,0,w,h),d=id.data;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const n=fbm(x/w*scale,y/h*scale,0,4,seed,scale);const k=(y*w+x)*4;const m=mixRgb(base,tint,n*amp);d[k]=m[0];d[k+1]=m[1];d[k+2]=m[2];d[k+3]=255}
 ctx.putImageData(id,0,0);
}
const memo=(key,fn)=>{if(!canPaint)return null;if(!cache.has(key))cache.set(key,fn());return cache.get(key)};
const S=n=>Math.max(64,Math.round(n*SCALE));

export const barkTexture=()=>memo('bark',()=>{
 const w=S(256),h=S(256),c=cv(w,h),x=c.getContext('2d'),r=rng(11);
 fillNoise(x,w,h,hexToRgb('#4a3829'),hexToRgb('#7a6244'),5,3,1);
 strokes(x,w,h,r,{colors:[hexToRgb('#2c2018'),hexToRgb('#3b2c1f'),hexToRgb('#5c4731')],count:900*SCALE,len:[14,48],width:[1.2,3.2],alpha:[.25,.6],angle:()=>Math.PI/2+(r()-.5)*.25});
 strokes(x,w,h,r,{colors:[hexToRgb('#8d7554'),hexToRgb('#6f5a40')],count:260*SCALE,len:[6,20],width:[1,2.4],alpha:[.15,.35],angle:()=>Math.PI/2+(r()-.5)*.3});
 return toTex(c);
});
export const leafTexture=(tint='#5f8a47')=>memo('leaf'+tint,()=>{
 const w=S(256),h=S(256),c=cv(w,h),x=c.getContext('2d'),r=rng(5);const base=hexToRgb(tint);
 fillNoise(x,w,h,mixRgb(base,[20,40,20],.2),mixRgb(base,[215,230,130],.3),6,9,1);
 // clusters of painted leaves, lighter on top-left like a lit canopy
 for(let i=0;i<650*SCALE;i++){
  const px=r()*w,py=r()*h,a=r()*Math.PI*2,l=7+r()*13,k=r();const col=mixRgb(mixRgb(base,[10,28,14],.25),mixRgb(base,[235,240,130],.45),k);
  for(const ox of [-w,0,w])for(const oy of [-h,0,h]){x.save();x.translate(px+ox,py+oy);x.rotate(a);x.fillStyle=rgb(col,.5+r()*.4);x.beginPath();x.ellipse(0,0,l,l*.38,0,0,Math.PI*2);x.fill();x.strokeStyle=rgb([20,45,20],.22);x.lineWidth=1;x.beginPath();x.moveTo(-l,0);x.lineTo(l,0);x.stroke();x.restore()}
 }
 return toTex(c);
});
export const grassBladeTexture=()=>memo('blade',()=>{
 const w=64,h=128,c=cv(w,h),x=c.getContext('2d');
 const g=x.createLinearGradient(0,h,0,0);g.addColorStop(0,'#3c5a2a');g.addColorStop(.55,'#78a24a');g.addColorStop(1,'#c9de86');
 x.fillStyle=g;x.beginPath();x.moveTo(8,h);x.quadraticCurveTo(w*.42,h*.45,w*.5,0);x.quadraticCurveTo(w*.58,h*.45,w-8,h);x.closePath();x.fill();
 x.strokeStyle='rgba(30,60,20,.35)';x.lineWidth=1.5;x.beginPath();x.moveTo(w/2,h);x.lineTo(w/2,4);x.stroke();
 return toTex(c,{repeat:false});
});
// Large painted ground: moss, soil and leaf litter (woodland) or dry grass and earth (savanna).
export const groundTexture=(kind='woodland')=>memo('ground'+kind,()=>{
 const w=S(512),h=S(512),c=cv(w,h),x=c.getContext('2d'),r=rng(kind==='savanna'?71:31);
 const pal=kind==='savanna'?{a:'#c9ac68',b:'#e4cf8e',c:'#9a8348',d:'#f0e2a8'}:{a:'#6f8f54',b:'#92b365',c:'#7a6444',d:'#a4c474'};
 fillNoise(x,w,h,hexToRgb(pal.a),hexToRgb(pal.b),4,7,1);
 strokes(x,w,h,r,{colors:[hexToRgb(pal.c),hexToRgb(pal.a)],count:520*SCALE,len:[10,36],width:[3,9],alpha:[.1,.25]});
 strokes(x,w,h,r,{colors:[hexToRgb(pal.b),hexToRgb(pal.d)],count:1500*SCALE,len:[5,16],width:[1,2.4],alpha:[.2,.5],angle:()=>-Math.PI/2+(r()-.5)*.9});
 strokes(x,w,h,r,{colors:[hexToRgb(pal.c),[60,44,28]],count:420*SCALE,len:[4,9],width:[1.5,3],alpha:[.15,.4]});
 return toTex(c);
});
export const rockTexture=()=>memo('rock',()=>{
 const w=S(256),h=S(256),c=cv(w,h),x=c.getContext('2d'),r=rng(21);
 fillNoise(x,w,h,hexToRgb('#7a7568'),hexToRgb('#b3aa94'),4,13,1);
 strokes(x,w,h,r,{colors:[hexToRgb('#4d493f'),hexToRgb('#6a6558')],count:500*SCALE,len:[10,40],width:[1,3],alpha:[.18,.45],angle:()=>(r()-.5)*.8});
 strokes(x,w,h,r,{colors:[hexToRgb('#d2cab4'),hexToRgb('#c0b89f')],count:300*SCALE,len:[6,20],width:[1,2.5],alpha:[.12,.3],angle:()=>(r()-.5)*.8});
 for(let i=0;i<60*SCALE;i++){x.fillStyle=rgb(hexToRgb(i%3?'#6f8a58':'#8a9a5c'),.22);x.beginPath();x.arc(r()*w,r()*h,3+r()*9,0,7);x.fill()}
 return toTex(c);
});
export const plankTexture=(tint='#8a6a45')=>memo('plank'+tint,()=>{
 const w=S(256),h=S(256),c=cv(w,h),x=c.getContext('2d'),r=rng(41);const base=hexToRgb(tint);
 const planks=6,ph=h/planks;
 for(let i=0;i<planks;i++){x.fillStyle=rgb(jitter(base,36,r()));x.fillRect(0,i*ph,w,ph);}
 strokes(x,w,h,r,{colors:[mixRgb(base,[0,0,0],.45),mixRgb(base,[0,0,0],.25)],count:700*SCALE,len:[20,120],width:[.8,2],alpha:[.12,.35],angle:()=>(r()-.5)*.05});
 strokes(x,w,h,r,{colors:[mixRgb(base,[255,240,200],.3)],count:200*SCALE,len:[10,50],width:[.8,1.8],alpha:[.1,.25],angle:()=>(r()-.5)*.05});
 x.strokeStyle='rgba(30,20,10,.55)';x.lineWidth=2;for(let i=1;i<planks;i++){x.beginPath();x.moveTo(0,i*ph);x.lineTo(w,i*ph);x.stroke()}
 return toTex(c);
});
export const thatchTexture=()=>memo('thatch',()=>{
 const w=S(256),h=S(256),c=cv(w,h),x=c.getContext('2d'),r=rng(51);
 fillNoise(x,w,h,hexToRgb('#8a7442'),hexToRgb('#cdb66e'),5,17,1);
 strokes(x,w,h,r,{colors:[hexToRgb('#5d4a28'),hexToRgb('#a58a4c'),hexToRgb('#d9c47f')],count:2600*SCALE,len:[22,60],width:[1,2.4],alpha:[.2,.55],angle:()=>Math.PI/2+(r()-.5)*.18});
 x.strokeStyle='rgba(60,45,20,.35)';x.lineWidth=2;for(let i=0;i<8;i++){const y=i*h/8;x.beginPath();x.moveTo(0,y);x.lineTo(w,y+(r()-.5)*6);x.stroke()}
 return toTex(c);
});
export const shingleTexture=(tint='#6c5a45')=>memo('shingle'+tint,()=>{
 const w=S(256),h=S(256),c=cv(w,h),x=c.getContext('2d'),r=rng(61);const base=hexToRgb(tint);
 const rows=8,cols=6,rh=h/rows,cw=w/cols;
 for(let j=0;j<rows;j++)for(let i=-1;i<cols;i++){const ox=(j%2)*cw/2;x.fillStyle=rgb(jitter(base,42,r()));x.fillRect(i*cw+ox,j*rh,cw,rh);x.strokeStyle='rgba(20,14,8,.5)';x.lineWidth=1.5;x.strokeRect(i*cw+ox,j*rh,cw,rh)}
 strokes(x,w,h,r,{colors:[mixRgb(base,[0,0,0],.4),mixRgb(base,[255,235,200],.25)],count:700*SCALE,len:[6,24],width:[.8,1.8],alpha:[.1,.3],angle:()=>Math.PI/2+(r()-.5)*.2});
 return toTex(c);
});
export const plasterTexture=(tint='#d8c9a4')=>memo('plaster'+tint,()=>{
 const w=S(256),h=S(256),c=cv(w,h),x=c.getContext('2d'),r=rng(81);const base=hexToRgb(tint);
 fillNoise(x,w,h,mixRgb(base,[0,0,0],.12),mixRgb(base,[255,250,235],.15),5,23,1);
 strokes(x,w,h,r,{colors:[mixRgb(base,[0,0,0],.3),mixRgb(base,[255,255,255],.3)],count:900*SCALE,len:[10,34],width:[2,6],alpha:[.05,.16],angle:()=>(r()-.5)*.7});
 return toTex(c);
});
export const clothTexture=()=>memo('cloth',()=>{
 const w=S(128),h=S(128),c=cv(w,h),x=c.getContext('2d'),r=rng(91);
 x.fillStyle='#ffffff';x.fillRect(0,0,w,h);
 x.strokeStyle='rgba(0,0,0,.09)';x.lineWidth=1;for(let i=0;i<w;i+=3){x.beginPath();x.moveTo(i,0);x.lineTo(i,h);x.stroke()}for(let i=0;i<h;i+=3){x.beginPath();x.moveTo(0,i);x.lineTo(w,i);x.stroke()}
 strokes(x,w,h,r,{colors:[[0,0,0],[255,255,255]],count:300,len:[6,16],width:[1,2],alpha:[.03,.09]});
 return toTex(c);
});
// Tileable neutral fur / skin detail used as a bump map on animal limbs.
export const furTexture=()=>memo('fur',()=>{
 const w=S(256),h=S(256),c=cv(w,h),x=c.getContext('2d'),r=rng(101);
 x.fillStyle='#8a8a8a';x.fillRect(0,0,w,h);
 strokes(x,w,h,r,{colors:[[40,40,40],[220,220,220],[120,120,120]],count:5200*SCALE,len:[5,14],width:[.8,1.6],alpha:[.12,.4],angle:()=>Math.PI/2+(r()-.5)*.5});
 return toTex(c,{srgb:false});
});
export const waterNormal=()=>memo('waterN',()=>{
 const n=S(256),c=cv(n,n),x=c.getContext('2d'),id=x.createImageData(n,n),d=id.data;
 const H=(i,j)=>fbm(i/n*6,j/n*6,0,4,5,6)+fbm(i/n*14,j/n*14,0,2,9,14)*.35;
 for(let y=0;y<n;y++)for(let i=0;i<n;i++){const dx=H(i+1,y)-H(i-1,y),dy=H(i,y+1)-H(i,y-1);const nx=-dx*5,ny=-dy*5,nz=1,l=Math.hypot(nx,ny,nz);const k=(y*n+i)*4;d[k]=(nx/l*.5+.5)*255;d[k+1]=(ny/l*.5+.5)*255;d[k+2]=(nz/l*.5+.5)*255;d[k+3]=255}
 x.putImageData(id,0,0);return toTex(c,{srgb:false});
});
export const cloudTexture=()=>memo('cloud',()=>{
 const w=256,h=128,c=cv(w,h),x=c.getContext('2d'),r=rng(7);
 for(let i=0;i<46;i++){const px=40+r()*(w-80),py=h*.5+(r()-.5)*h*.28,rad=14+r()*26;const g=x.createRadialGradient(px,py,0,px,py,rad);g.addColorStop(0,'rgba(255,255,255,.85)');g.addColorStop(.6,'rgba(255,255,255,.35)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.beginPath();x.arc(px,py,rad,0,7);x.fill()}
 x.globalCompositeOperation='source-atop';const sh=x.createLinearGradient(0,0,0,h);sh.addColorStop(0,'rgba(255,255,255,0)');sh.addColorStop(1,'rgba(150,170,200,.45)');x.fillStyle=sh;x.fillRect(0,0,w,h);
 return toTex(c,{repeat:false});
});
export const flowerTexture=()=>memo('flower',()=>{
 const n=64,c=cv(n,n),x=c.getContext('2d');x.translate(n/2,n/2);
 for(let i=0;i<6;i++){x.rotate(Math.PI/3);x.fillStyle='#ffffff';x.beginPath();x.ellipse(0,-15,8,15,0,0,7);x.fill();x.strokeStyle='rgba(0,0,0,.12)';x.beginPath();x.moveTo(0,-4);x.lineTo(0,-26);x.stroke()}
 x.fillStyle='#f2c94c';x.beginPath();x.arc(0,0,7,0,7);x.fill();return toTex(c,{repeat:false});
});

// Per-species body painting. u runs around the body ring (0 = spine line, .5 = belly), v runs nose-to-tail
// along the loft (0 = tail tip, 1 = nose). Markings are functions of both so they wrap the form naturally.
export function bodyTexture(spec){
 return memo('body'+JSON.stringify(spec),()=>{
  const w=S(256),h=S(512),c=cv(w,h),x=c.getContext('2d'),id=x.createImageData(w,h),d=id.data;
  const back=hexToRgb(spec.back),belly=hexToRgb(spec.belly||spec.back),dark=hexToRgb(spec.dark||'#2a2118'),acc=spec.accent?hexToRgb(spec.accent):null;
  const seed=spec.seed||3;
  for(let y=0;y<h;y++){
   const v=1-y/h;
   for(let i=0;i<w;i++){
    const u=i/w,th=u*Math.PI*2,top=Math.cos(th)*.5+.5;       // 1 on the spine, 0 on the belly
    const side=Math.abs(Math.sin(th));
    let col=mixRgb(belly,back,smooth(.15,.75,top));
    const n=fbm(u*16,v*34,0,4,seed,16);col=mixRgb(col,mixRgb(col,[255,255,255],.25),(n-.5)*.6);
    // brush-stroke streaking along the body
    const st=vnoise(u*90,v*6,0,seed+5,90);col=mixRgb(col,dark,(st-.5)*.16);
    const m=spec.marks;
    if(m==='stripes'||m==='zebra'){
     const f=m==='zebra'?34:22;const wob=fbm(u*6,v*10,0,3,seed+9)*(m==='zebra'?.5:.9);
     const s=Math.sin((v*f+wob+Math.sin(th)*.6*(m==='zebra'?0:1))*Math.PI*2*.5);
     const widthK=m==='zebra'?.15:.42*(0.35+top*.85)*(.55+side*.6);
     const mask=smooth(widthK,widthK-.12,Math.abs(s)-.1+(m==='zebra'?0:.15))*(top>.18||m==='zebra'?1:0);
     if(m==='stripes'){const taper=smooth(.08,.5,v)*(1-smooth(.82,.98,v)*.3);col=mixRgb(col,dark,clamp01(mask*taper*(1-smooth(.35,.7,1-top)*.0)))}
     else{const zs=Math.sin((v*f+wob+Math.sin(th*2)*.12)*Math.PI*2*.5);col=mixRgb(col,dark,clamp01(smooth(.14,-.14,zs)*smooth(.02,.12,v)*.96))}
    }else if(m==='spots'){
     const gx=u*26,gy=v*46;const cell=[Math.floor(gx),Math.floor(gy)];let dm=9;
     for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const cx=cell[0]+a+.2+.6*vnoise(cell[0]+a,cell[1]+b,0,seed+2),cy=cell[1]+b+.2+.6*vnoise(cell[0]+a,cell[1]+b,0,seed+3);dm=Math.min(dm,Math.hypot(gx-cx,gy-cy))}
     col=mixRgb(col,dark,smooth(.42,.3,dm)*smooth(.1,.35,top+side*.2));
    }else if(m==='patches'){
     const gx=u*9,gy=v*30;let d1=9,d2=9;const cx0=Math.floor(gx),cy0=Math.floor(gy);
     for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const px=cx0+a+vnoise(cx0+a,cy0+b,0,seed+4),py=cy0+b+vnoise(cx0+a,cy0+b,0,seed+6);const dd=Math.hypot(gx-px,(gy-py)*.45);if(dd<d1){d2=d1;d1=dd}else if(dd<d2)d2=dd}
     col=mixRgb(col,dark,smooth(.09,.0,d2-d1-.03)*.0+smooth(.07,-.02,d2-d1-.03));
     col=mixRgb(col,mixRgb(back,dark,.55),smooth(.4,.0,d1)*.0);
    }else if(m==='bars'){const bs=Math.sin(v*52+fbm(u*6,v*9,0,3,seed+2)*4);col=mixRgb(col,dark,smooth(.2,.85,bs)*.6*(1-smooth(.84,.95,v))*(.5+side*.5))}
    else if(m==='plates'){col=mixRgb(col,dark,smooth(.0,.5,fbm(u*5,v*12,0,3,seed+1)-.35)*.5)}
    else if(m==='saddle'){col=mixRgb(col,dark,smooth(.5,.9,top)*smooth(.2,.55,v)*smooth(.8,.6,v)*.8)}
    // face painting on the last 22% of the loft (head and muzzle)
    if(spec.face&&v>.78){const k=smooth(.78,.84,v);const f=spec.face;
     if(f==='mask'){const band=smooth(.3,.2,Math.abs(top-.62))*smooth(.86,.9,v)*smooth(.99,.93,v);col=mixRgb(col,dark,band*.9*k)}
     if(f==='lightmuzzle'&&v>.9)col=mixRgb(col,hexToRgb(spec.muzzle||'#efe0bb'),smooth(.9,.94,v)*(1-top*.5));
     if(f==='tiger'){const s=Math.sin(v*70+Math.sin(th)*3);col=mixRgb(col,dark,smooth(.5,.8,s)*top*.7*k);col=mixRgb(col,hexToRgb('#f5ead0'),smooth(.92,.96,v)*.9*(1-top*.4))}
     if(f==='tears')col=mixRgb(col,dark,smooth(.12,.02,Math.abs(side-.78))*smooth(.9,.86,v)*smooth(.78,.84,v)*.95);
    }
    if(acc&&spec.accentArea==='belly')col=mixRgb(col,acc,smooth(.35,.1,top)*.9);
    if(acc&&spec.accentArea==='tip')col=mixRgb(col,acc,smooth(.12,.02,v)*.9);
    const k=(y*w+i)*4;d[k]=col[0];d[k+1]=col[1];d[k+2]=col[2];d[k+3]=255;
   }
  }
  x.putImageData(id,0,0);
  const r=rng(seed*13);strokes(x,w,h,r,{colors:[[0,0,0],[255,255,255]],count:900*SCALE,len:[5,14],width:[.8,1.8],alpha:[.03,.08],angle:()=>Math.PI/2+(r()-.5)*.4,wrap:true});
  return toTex(c);
 });
}

// Painted wooden sign with hand-lettered text.
export function signTexture(text,{bg='#d9c595',fg='#4a3b24',w=512,h=128}={}){
 return memo('sign'+text+bg+fg,()=>{
  const c=cv(w,h),x=c.getContext('2d'),r=rng(text.length*7);
  x.fillStyle=bg;x.fillRect(0,0,w,h);
  strokes(x,w,h,r,{colors:[mixRgb(hexToRgb(bg),[0,0,0],.3),mixRgb(hexToRgb(bg),[255,255,255],.3)],count:380,len:[30,120],width:[1,3],alpha:[.05,.18],angle:()=>(r()-.5)*.06,wrap:false});
  x.strokeStyle=fg;x.lineWidth=6;x.strokeRect(8,8,w-16,h-16);
  let size=Math.floor(h*.5);x.font='700 '+size+'px "Playfair Display", Georgia, serif';while(x.measureText(text).width>w-50&&size>14){size-=2;x.font='700 '+size+'px "Playfair Display", Georgia, serif'}
  x.fillStyle=fg;x.textAlign='center';x.textBaseline='middle';x.fillText(text,w/2,h/2+3);
  return toTex(c,{repeat:false});
 });
}
export const mapTexture=()=>memo('mapboard',()=>{
 const w=256,h=128,c=cv(w,h),x=c.getContext('2d'),r=rng(3);x.fillStyle='#d9cfa8';x.fillRect(0,0,w,h);
 x.strokeStyle='#8a7a52';x.lineWidth=1;for(let i=0;i<10;i++){x.beginPath();x.moveTo(0,r()*h);x.bezierCurveTo(w*.3,r()*h,w*.6,r()*h,w,r()*h);x.stroke()}
 x.fillStyle='#7aa0a8';x.beginPath();x.moveTo(60,0);x.bezierCurveTo(90,40,40,80,80,128);x.lineTo(98,128);x.bezierCurveTo(60,80,110,40,80,0);x.fill();
 for(let i=0;i<14;i++){x.fillStyle=['#c0504a','#4a7ac0','#e0b040'][i%3];x.beginPath();x.arc(20+r()*(w-40),14+r()*(h-28),3,0,7);x.fill()}
 return toTex(c,{repeat:false});
});
