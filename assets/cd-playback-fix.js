(()=>{
  const loader=document.getElementById('loader');
  let bootReady=false;
  const bootStyle=document.createElement('style');
  bootStyle.textContent=`
    .loader{z-index:9999!important;background:#00184c!important;transition:opacity .34s ease,visibility .34s ease!important}
    .loader>div{width:min(260px,62vw)!important;text-align:center!important;display:grid!important;place-items:center!important}
    .loader .bootTrack{display:block!important;position:relative!important;width:min(210px,56vw)!important;height:3px!important;border:1px solid #6b8fc4!important;background:#062969!important;overflow:hidden!important}
    .loader .bootTrack i{position:absolute!important;top:0!important;bottom:0!important;width:28%!important;background:#f3dc54!important;box-shadow:none!important;animation:inkiviBoot .92s steps(14,end) infinite!important}
    @keyframes inkiviBoot{0%{left:-30%}100%{left:104%}}
  `;
  document.head.appendChild(bootStyle);
  if(loader)loader.innerHTML='<div><span class="bootTrack"><i></i></span></div>';

  const bootGuard=loader?new MutationObserver(()=>{
    if(!bootReady&&loader.classList.contains('done'))loader.classList.remove('done');
  }):null;
  if(loader)bootGuard.observe(loader,{attributes:true,attributeFilter:['class']});

  const addCss=(href)=>new Promise(resolve=>{
    const link=document.createElement('link');link.rel='stylesheet';link.href=href;
    link.onload=()=>resolve(true);link.onerror=()=>resolve(false);document.head.appendChild(link);
  });
  const cssReady=[
    addCss('./assets/mobile-fix.css?v=20260808d'),
    addCss('./assets/ui-polish.css?v=20260808c'),
    addCss('./assets/win98-ps1-theme.css?v=20260808c'),
    addCss('./assets/panel-header-fix.css?v=20260809d'),
    addCss('./assets/visual-tuning.css?v=20260809b'),
    addCss('./assets/grain-overlay.css?v=20260809n')
  ];

  document.querySelector('.inkiviGrain')?.remove();
  document.querySelectorAll('.retroFx').forEach(x=>x.remove());
  document.documentElement.classList.remove('inkivi-custom-cursor');
  document.querySelectorAll('.inkiviCursor').forEach(x=>x.remove());

  /* One VCR layer above the UI. The only exclusions are CURRENTLY VISIBLE
     artwork containers; component styles themselves are never modified. */
  document.getElementById('vcrMonitorFx')?.remove();
  const NS='http://www.w3.org/2000/svg';
  const fx=document.createElementNS(NS,'svg');
  fx.id='vcrMonitorFx';
  fx.setAttribute('aria-hidden','true');
  fx.setAttribute('preserveAspectRatio','none');
  fx.innerHTML=`
    <defs>
      <filter id="vcrNoiseFilter" x="-15%" y="-15%" width="130%" height="130%">
        <feTurbulence id="vcrTurbulence" type="fractalNoise" baseFrequency="0.72 0.95" numOctaves="3" seed="11" stitchTiles="stitch"/>
        <feColorMatrix type="matrix" values="0.22 0 0 0 0  0 0.28 0 0 0  0 0 0.42 0 0  0 0 0 .72 0"/>
      </filter>
      <pattern id="vcrScanPattern" width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="4" height="1" fill="rgba(0,0,0,.78)"/>
        <rect y="1" width="4" height="1" fill="rgba(160,200,255,.10)"/>
      </pattern>
      <pattern id="vcrPixelPattern" width="3" height="3" patternUnits="userSpaceOnUse">
        <rect width="1" height="3" fill="rgba(255,80,80,.18)"/>
        <rect x="1" width="1" height="3" fill="rgba(90,220,150,.12)"/>
        <rect x="2" width="1" height="3" fill="rgba(90,145,255,.20)"/>
      </pattern>
      <radialGradient id="vcrShadeGradient" cx="50%" cy="46%" r="72%">
        <stop offset="55%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="100%" stop-color="rgba(0,2,22,.95)"/>
      </radialGradient>
      <mask id="vcrCutMask" maskUnits="userSpaceOnUse">
        <rect id="vcrMaskBase" x="0" y="0" width="100%" height="100%" fill="white"/>
        <g id="vcrMaskHoles"></g>
      </mask>
    </defs>
    <g class="vcrRasterGroup" mask="url(#vcrCutMask)">
      <rect class="vcrNoise" x="-40" y="-40" width="calc(100% + 80px)" height="calc(100% + 80px)" filter="url(#vcrNoiseFilter)"/>
      <g class="vcrScanMover"><rect class="vcrScan" x="0" y="-8" width="100%" height="calc(100% + 16px)" fill="url(#vcrScanPattern)"/></g>
      <rect class="vcrPixel" x="0" y="0" width="100%" height="100%" fill="url(#vcrPixelPattern)"/>
      <rect class="vcrShade" x="0" y="0" width="100%" height="100%" fill="url(#vcrShadeGradient)"/>
    </g>`;
  document.body.appendChild(fx);

  const protectedSelectors=[
    '.releaseCoverBox',
    '.cdScene',
    '#heroReleaseCover','.heroReleaseCover','.heroCover',
    '.dockCover'
  ].join(',');
  const holes=fx.querySelector('#vcrMaskHoles');
  const turb=fx.querySelector('#vcrTurbulence');
  const isActuallyVisible=el=>{
    if(!el?.isConnected)return false;
    if(el.closest('.view.off'))return false;
    const panel=el.closest('.panel');
    if(panel&&!panel.classList.contains('on'))return false;
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)===0)return false;
    const r=el.getBoundingClientRect();
    if(r.width<2||r.height<2)return false;
    if(r.bottom<=0||r.right<=0||r.top>=innerHeight||r.left>=innerWidth)return false;
    return true;
  };
  const syncVcrMask=()=>{
    const w=window.innerWidth,h=window.innerHeight;
    fx.setAttribute('viewBox',`0 0 ${w} ${h}`);
    const base=fx.querySelector('#vcrMaskBase');
    base?.setAttribute('width',String(w));base?.setAttribute('height',String(h));
    if(!holes)return;
    holes.replaceChildren();

    /* During the black scene transition the VCR overlay remains above .fade.
       Cutting media holes at that moment exposes the black fade as rectangles.
       Keep the mask solid until the transition is over, then recalculate. */
    if(document.getElementById('fade')?.classList.contains('active'))return;

    document.querySelectorAll(protectedSelectors).forEach(el=>{
      if(!isActuallyVisible(el))return;
      const r=el.getBoundingClientRect();
      const pad=2;
      const shape=document.createElementNS(NS,el.matches('.cdScene')?'ellipse':'rect');
      if(el.matches('.cdScene')){
        shape.setAttribute('cx',String(r.left+r.width/2));
        shape.setAttribute('cy',String(r.top+r.height/2));
        shape.setAttribute('rx',String(r.width/2+pad));
        shape.setAttribute('ry',String(r.height/2+pad));
      }else{
        shape.setAttribute('x',String(r.left-pad));shape.setAttribute('y',String(r.top-pad));
        shape.setAttribute('width',String(r.width+pad*2));shape.setAttribute('height',String(r.height+pad*2));
        shape.setAttribute('rx','2');
      }
      shape.setAttribute('fill','black');
      holes.appendChild(shape);
    });
  };
  let maskFrame=0;
  const queueMask=()=>{if(maskFrame)return;maskFrame=requestAnimationFrame(()=>{maskFrame=0;syncVcrMask()})};
  const refreshMaskBurst=()=>{
    queueMask();
    requestAnimationFrame(queueMask);
    setTimeout(queueMask,80);
    setTimeout(queueMask,220);
    setTimeout(queueMask,520);
    setTimeout(queueMask,900);
  };
  window.addEventListener('resize',refreshMaskBurst,{passive:true});
  window.addEventListener('scroll',queueMask,{passive:true});
  document.addEventListener('transitionrun',refreshMaskBurst,true);
  document.addEventListener('transitionend',refreshMaskBurst,true);
  document.addEventListener('click',refreshMaskBurst,true);
  const vcrObserver=new MutationObserver(refreshMaskBurst);
  vcrObserver.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
  syncVcrMask();

  let noiseSeed=11;
  setInterval(()=>{
    if(document.hidden||!turb)return;
    noiseSeed=(noiseSeed+17)%997;
    turb.setAttribute('seed',String(noiseSeed));
    turb.setAttribute('baseFrequency',`${(0.68+Math.random()*.10).toFixed(3)} ${(0.88+Math.random()*.14).toFixed(3)}`);
  },140);

  if(matchMedia('(pointer:fine)').matches){
    const old=document.querySelector('.retroCursor');
    if(old)old.remove();
    const c=document.createElement('div');
    c.className='retroCursor';
    c.setAttribute('aria-hidden','true');
    c.innerHTML=`
      <svg class="cursorArrow" viewBox="0 0 28 32" aria-hidden="true">
        <path d="M2 1v24l6-6 5 11 5-2-5-10h9L2 1Z" fill="#fff" stroke="#050505" stroke-width="2" stroke-linejoin="miter"/>
      </svg>
      <svg class="cursorHand" viewBox="0 0 28 32" aria-hidden="true">
        <path d="M11 2h5v11h2V8h4v7h2v-4h3v12h-2v5H10l-2-3-4-6v-5h4l3 4V2Z" fill="#fff" stroke="#050505" stroke-width="2" stroke-linejoin="miter"/>
        <path d="M12 4h2v11h-2zM19 10h1v7h-1zM24 13h1v6h-1z" fill="#050505"/>
      </svg>`;
    document.body.appendChild(c);
    document.documentElement.classList.add('retroCursorOn');
    const interactive='a,button,[role="button"],input[type="button"],input[type="submit"],input[type="range"],.zone,.platformLink,.trackPlay,.trackToggle,.dockPlay,.dockClose,.btn';
    const move=e=>{
      c.style.setProperty('transform',`translate3d(${e.clientX}px,${e.clientY}px,0)`,'important');
      c.classList.toggle('is-pointer',!!e.target.closest?.(interactive));
    };
    window.addEventListener('pointermove',move,{passive:true});
    window.addEventListener('blur',()=>{c.style.setProperty('transform','translate3d(-80px,-80px,0)','important')});
  }

  const playerReady=new Promise(resolve=>{
    const player=document.createElement('script');
    player.src='./assets/player-v3.js?v=20260809c';player.defer=true;
    player.onload=()=>resolve(true);player.onerror=()=>resolve(false);document.head.appendChild(player);
  });

  const pageReady=document.readyState==='complete'?Promise.resolve():new Promise(r=>window.addEventListener('load',r,{once:true}));
  const minBoot=new Promise(r=>setTimeout(r,520));
  Promise.allSettled([...cssReady,playerReady,pageReady,minBoot]).then(async()=>{
    try{await document.fonts?.load?.('400 16px "IBM Plex Mono"');await document.fonts?.ready}catch{}
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      bootReady=true;bootGuard?.disconnect();loader?.classList.add('done');
      refreshMaskBurst();
    }));
  });

  const PLAY='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  const PAUSE='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>';
  const norm=s=>String(s||'').toLowerCase().replace(/^inkivi\s*[-—–:]\s*/i,'').replace(/\s*[\[(](feat\.?|ft\.?)[^\])]*[\])]/gi,'').replace(/\s+(feat\.?|ft\.?)\s+.+$/gi,'').replace(/[^a-zа-яё0-9]+/gi,' ').trim();
  function dock(){return document.getElementById('globalAudioDock')}
  function isPlaying(){return !!dock()?.classList.contains('playing')}
  function currentTitle(){return norm(dock()?.querySelector('.dockTitle')?.textContent)}
  function findReleaseTrackButton(){const title=currentTitle();if(!title)return null;const buttons=[...document.querySelectorAll('.releaseCard .trackPlay')];return buttons.find(b=>norm(b.dataset.title||b.textContent)===title)||buttons.find(b=>{const t=norm(b.dataset.title||b.textContent);return t&&(t.includes(title)||title.includes(t))})||null}
  function syncDockIcon(){const btn=dock()?.querySelector('.dockPlay');if(btn)btn.innerHTML=isPlaying()?PAUSE:PLAY}
  function syncTrackButtons(active){document.querySelectorAll('.releaseCard .trackPlay').forEach(btn=>{const on=!!active&&btn===active&&isPlaying();btn.innerHTML=on?PAUSE:PLAY;btn.classList.toggle('active',on);btn.setAttribute('aria-label',on?'пауза':'воспроизвести')})}
  function syncCardState(){syncDockIcon();document.querySelectorAll('.releaseCard.is-active,.releaseCard.is-playing').forEach(card=>card.classList.remove('is-active','is-playing'));const active=findReleaseTrackButton();syncTrackButtons(active);if(!active)return;const card=active.closest('.releaseCard');if(card)card.classList.add('is-active');if(isPlaying()&&card)card.classList.add('is-playing')}
  function prepareLabel(label){if(label.dataset.spinFace==='1')return;const art=label.style.backgroundImage;if(art&&art!=='none')label.style.setProperty('--cd-label-art',art);label.style.backgroundImage='none';label.dataset.spinFace='1'}
  function scan(root=document){root.querySelectorAll?.('.cdLabel').forEach(prepareLabel);refreshMaskBurst()}
  let syncQueued=false;
  function queueSync(){if(syncQueued)return;syncQueued=true;requestAnimationFrame(()=>{syncQueued=false;syncCardState();refreshMaskBurst()})}
  const observer=new MutationObserver(mutations=>{let dirty=false;for(const m of mutations){if(m.type==='childList'){m.addedNodes.forEach(n=>{if(n.nodeType===1)scan(n)});if(m.addedNodes.length||m.removedNodes.length)dirty=true}if(m.type==='attributes'&&m.target.id==='globalAudioDock')dirty=true}if(dirty)queueSync()});
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('click',e=>{if(e.target.closest?.('.trackPlay,.dockPlay,.dockClose'))setTimeout(queueSync,80)},true);
  scan();queueSync();
})();