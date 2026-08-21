(()=>{
'use strict';

const NS='http://www.w3.org/2000/svg';
const svg=document.createElementNS(NS,'svg');
svg.id='vcrMonitorFx';
svg.setAttribute('aria-hidden','true');
svg.setAttribute('preserveAspectRatio','none');
svg.innerHTML=`
  <defs>
    <filter id="vcrNoiseFilter" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency=".72 .94" numOctaves="3" seed="17" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values=".24 0 0 0 0  0 .3 0 0 0  0 0 .46 0 0  0 0 0 .7 0"/>
    </filter>
    <pattern id="vcrScanPattern" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="1" fill="rgba(0,0,0,.76)"/>
      <rect y="1" width="4" height="1" fill="rgba(160,200,255,.12)"/>
    </pattern>
    <pattern id="vcrPixelPattern" width="3" height="3" patternUnits="userSpaceOnUse">
      <rect width="1" height="3" fill="rgba(255,80,80,.16)"/>
      <rect x="1" width="1" height="3" fill="rgba(90,220,150,.11)"/>
      <rect x="2" width="1" height="3" fill="rgba(90,145,255,.18)"/>
    </pattern>
    <radialGradient id="vcrShadeGradient" cx="50%" cy="46%" r="72%">
      <stop offset="54%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="100%" stop-color="rgba(0,2,22,.92)"/>
    </radialGradient>
    <mask id="vcrCutMask" maskUnits="userSpaceOnUse">
      <rect id="vcrMaskBase" fill="white"/>
      <g id="vcrMaskHoles"></g>
    </mask>
  </defs>
  <g mask="url(#vcrCutMask)">
    <rect class="vcrNoise" filter="url(#vcrNoiseFilter)"/>
    <g class="vcrScanMover"><rect class="vcrScan" fill="url(#vcrScanPattern)"/></g>
    <rect class="vcrPixel" fill="url(#vcrPixelPattern)"/>
    <rect class="vcrShade" fill="url(#vcrShadeGradient)"/>
  </g>`;
document.body.appendChild(svg);

const holes=svg.querySelector('#vcrMaskHoles');
const base=svg.querySelector('#vcrMaskBase');
const layers=[...svg.querySelectorAll('.vcrNoise,.vcrScan,.vcrPixel,.vcrShade')];
const protectedSelector=['.heroReleaseCover','.dockCover','.visualMedia','.visualFallback img','.cdCase','.cdDisc'].join(',');

function visible(element){
  if(!element?.isConnected||element.closest('[hidden],.view.off'))return false;
  const panel=element.closest('.panel');
  if(panel&&!panel.classList.contains('on'))return false;
  const style=getComputedStyle(element);
  if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)return false;
  const rect=element.getBoundingClientRect();
  return rect.width>2&&rect.height>2&&rect.bottom>0&&rect.right>0&&rect.top<innerHeight&&rect.left<innerWidth;
}

function sync(){
  const width=Math.max(1,innerWidth),height=Math.max(1,innerHeight);
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  [base,...layers].forEach(layer=>{layer.setAttribute('x','0');layer.setAttribute('y',layer.classList?.contains('vcrScan')?'-8':'0');layer.setAttribute('width',String(width));layer.setAttribute('height',String(height+(layer.classList?.contains('vcrScan')?16:0)))});
  holes.replaceChildren();
  const activePanel=document.querySelector('.panel.on');
  const seen=new Set();

  function paintElement(element,fill='black',pad=2){
    if(activePanel&&!element.closest('.panel')&&!element.closest('.audioDock'))return;
    if(!visible(element))return;
    const rect=element.getBoundingClientRect();
    const round=element.matches('.cdDisc');
    const key=[fill,round?'circle':'rect',Math.round(rect.left),Math.round(rect.top),Math.round(rect.width),Math.round(rect.height)].join(':');
    if(seen.has(key))return;
    seen.add(key);
    const shape=document.createElementNS(NS,round?'ellipse':'rect');
    if(round){
      shape.setAttribute('cx',String(rect.left+rect.width/2));
      shape.setAttribute('cy',String(rect.top+rect.height/2));
      shape.setAttribute('rx',String(rect.width/2+pad));
      shape.setAttribute('ry',String(rect.height/2+pad));
    }else{
      shape.setAttribute('x',String(Math.max(0,rect.left-pad)));
      shape.setAttribute('y',String(Math.max(0,rect.top-pad)));
      shape.setAttribute('width',String(Math.min(width,rect.right+pad)-Math.max(0,rect.left-pad)));
      shape.setAttribute('height',String(Math.min(height,rect.bottom+pad)-Math.max(0,rect.top-pad)));
      shape.setAttribute('rx','2');
    }
    shape.setAttribute('fill',fill);
    holes.appendChild(shape);
  }

  const protectedMedia=[...document.querySelectorAll(protectedSelector)];
  protectedMedia.filter(element=>!element.matches('.dockCover')).forEach(element=>paintElement(element));

  const audioDock=document.querySelector('.audioDock:not([hidden])');
  if(audioDock&&visible(audioDock))paintElement(audioDock,'white',0);

  protectedMedia.filter(element=>element.matches('.dockCover')).forEach(element=>paintElement(element));
}

let frame=0;
function refresh(){
  if(frame)return;
  frame=requestAnimationFrame(()=>{frame=0;sync()});
}
window.inkiviVcrRefresh=refresh;

addEventListener('resize',refresh,{passive:true});
addEventListener('scroll',refresh,{passive:true,capture:true});
addEventListener('pointermove',event=>{if(event.target.closest?.('.zone,.heroReleaseCover'))refresh()},{passive:true});
document.addEventListener('transitionrun',refresh,true);
document.addEventListener('transitionend',refresh,true);
new MutationObserver(mutations=>{
  if(mutations.every(mutation=>svg.contains(mutation.target)))return;
  refresh();
}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','src']});
sync();
})();
