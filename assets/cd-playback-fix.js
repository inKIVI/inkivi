(()=>{
  const loader=document.getElementById('loader');
  let bootReady=false;
  const bootStyle=document.createElement('style');
  bootStyle.textContent=`
    .loader{z-index:9999!important;background:#080604!important;transition:opacity .38s ease,visibility .38s ease!important}
    .loader>div{width:min(340px,72vw)!important;text-align:left!important}
    .loader .bootWord{display:block!important;margin:0 0 18px!important;font:900 clamp(44px,10vw,76px)/.82 "Arial Black",Impact,Tahoma,sans-serif!important;letter-spacing:-.065em!important;color:#eadfb7!important;text-shadow:2px 2px 0 #24180c!important}
    .loader .bootTrack{display:block!important;position:relative!important;width:100%!important;height:5px!important;border:1px solid #554832!important;background:#100c08!important;overflow:hidden!important}
    .loader .bootTrack i{position:absolute!important;top:0!important;bottom:0!important;width:31%!important;background:#c2a13d!important;animation:inkiviBoot 1.05s steps(14,end) infinite!important}
    @keyframes inkiviBoot{0%{left:-34%}100%{left:105%}}
  `;
  document.head.appendChild(bootStyle);
  if(loader)loader.innerHTML='<div><b class="bootWord">inkivi</b><span class="bootTrack"><i></i></span></div>';

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
    addCss('./assets/panel-header-fix.css?v=20260808c'),
    addCss('./assets/visual-tuning.css?v=20260808e')
  ];

  document.documentElement.classList.remove('inkivi-custom-cursor');
  document.querySelectorAll('.inkiviCursor').forEach(x=>x.remove());

  const playerReady=new Promise(resolve=>{
    const player=document.createElement('script');
    player.src='./assets/player-v3.js?v=20260808j';player.defer=true;
    player.onload=()=>resolve(true);player.onerror=()=>resolve(false);document.head.appendChild(player);
  });

  const fontReady=document.fonts?.ready?.catch?.(()=>{})||Promise.resolve();
  const pageReady=document.readyState==='complete'?Promise.resolve():new Promise(r=>window.addEventListener('load',r,{once:true}));
  const minBoot=new Promise(r=>setTimeout(r,650));
  Promise.allSettled([...cssReady,playerReady,fontReady,pageReady,minBoot]).then(()=>{
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      bootReady=true;bootGuard?.disconnect();loader?.classList.add('done');
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
  function scan(root=document){root.querySelectorAll?.('.cdLabel').forEach(prepareLabel)}
  let syncQueued=false;
  function queueSync(){if(syncQueued)return;syncQueued=true;requestAnimationFrame(()=>{syncQueued=false;syncCardState()})}
  const observer=new MutationObserver(mutations=>{let dirty=false;for(const m of mutations){if(m.type==='childList'){m.addedNodes.forEach(n=>{if(n.nodeType===1)scan(n)});if(m.addedNodes.length||m.removedNodes.length)dirty=true}if(m.type==='attributes'&&m.target.id==='globalAudioDock')dirty=true}if(dirty)queueSync()});
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('click',e=>{if(e.target.closest?.('.trackPlay,.dockPlay,.dockClose'))setTimeout(queueSync,80)},true);
  scan();queueSync();
})();
