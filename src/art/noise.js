// Small deterministic noise toolkit used by every procedural texture and mesh in the art layer.
export function rng(seed=1){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const hash=(x,y,z=0,s=0)=>{let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(z|0,2147483647)+Math.imul(s|0,1274126177);h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296};
const fade=t=>t*t*t*(t*(t*6-15)+10);
export function vnoise(x,y,z=0,seed=0,period=0){
 const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),xf=x-xi,yf=y-yi,zf=z-zi;
 const w=(v)=>period?((v%period)+period)%period:v;
 const g=(a,b,c)=>hash(w(xi+a),w(yi+b),zi+c,seed);
 const u=fade(xf),v=fade(yf),t=fade(zf);
 const l=(a,b,k)=>a+(b-a)*k;
 return l(l(l(g(0,0,0),g(1,0,0),u),l(g(0,1,0),g(1,1,0),u),v),l(l(g(0,0,1),g(1,0,1),u),l(g(0,1,1),g(1,1,1),u),v),t);
}
export function fbm(x,y,z=0,oct=4,seed=0,period=0){let a=.5,f=1,s=0,n=0;for(let i=0;i<oct;i++){s+=a*vnoise(x*f,y*f,z*f,seed+i*17,period?period*f:0);n+=a;a*=.5;f*=2}return s/n}
export const clamp01=v=>v<0?0:v>1?1:v;
export const smooth=(a,b,x)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t)};
export const mix=(a,b,t)=>a+(b-a)*t;
export function hexToRgb(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}
export function mixRgb(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]}
