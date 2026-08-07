(()=>{
  const mobileCss=document.createElement('link');
  mobileCss.rel='stylesheet';
  mobileCss.href='./assets/mobile-fix.css?v=20260808b';
  document.head.appendChild(mobileCss);

  const player=document.createElement('script');
  player.src='./assets/player-v3.js?v=20260808f';
  player.defer=true;
  document.head.appendChild(player);

  const PLAY='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  const PAUSE='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx=".5"/><rect x="14" y="5" width="4" height="14" rx=".5"/></svg>';
  const norm=s=>String(s||'').toLowerCase().replace(/^inkivi\s*[-—–:]\s*/i,'').replace(/\s*[\[(](feat\.?|ft\.?)[^\])]*[\])]/gi,'').replace(/\s+(feat\.?|ft\.?)\s+.+$/gi,'').replace(/[^a-zа-яё0-9]+/gi,' ').trim();

  function syncDockIcon(){
    const dock=document.getElementById('globalAudioDock');
    const btn=dock?.querySelector('.dockPlay');
    if(btn)btn.innerHTML=dock.classList.contains('playing')?PAUSE:PLAY;
  }

  function findCurrentButton(){
    const dock=document.getElementById('globalAudioDock');
    const title=norm(dock?.querySelector('.dockTitle')?.textContent);
    if(!title)return null;
    const buttons=[...document.querySelectorAll('.trackPlay,.heroPlayStrip')];
    return buttons.find(b=>norm(b.dataset.title||b.textContent)===title)
      || buttons.find(b=>{const t=norm(b.dataset.title||b.textContent);return t&&(t.includes(title)||title.includes(t))})
      || null;
  }

  function syncCardState(){
    const dock=document.getElementById('globalAudioDock');
    const playing=!!dock?.classList.contains('playing');
    syncDockIcon();

    document.querySelectorAll('.releaseCard.is-active,.releaseCard.is-playing').forEach(card=>card.classList.remove('is-active','is-playing'));
    document.querySelectorAll('.trackPlay.active,.heroPlayStrip.active').forEach(btn=>btn.classList.remove('active'));
    if(!playing)return;

    const active=findCurrentButton();
    if(!active)return;
    active.classList.add('active');
    const card=active.closest('.releaseCard');
    if(card)card.classList.add('is-active','is-playing');
  }

  function prepareLabel(label){
    if(label.dataset.spinFace==='1')return;
    const art=label.style.backgroundImage;
    if(art&&art!=='none')label.style.setProperty('--cd-label-art',art);
    label.style.backgroundImage='none';
    label.dataset.spinFace='1';
  }

  function scan(root=document){root.querySelectorAll?.('.cdLabel').forEach(prepareLabel)}

  let syncQueued=false;
  function queueSync(){
    if(syncQueued)return;
    syncQueued=true;
    requestAnimationFrame(()=>{syncQueued=false;syncCardState()});
  }

  const observer=new MutationObserver(mutations=>{
    let stateDirty=false;
    for(const m of mutations){
      if(m.type==='childList'){
        m.addedNodes.forEach(n=>{if(n.nodeType===1)scan(n)});
        if(m.addedNodes.length||m.removedNodes.length)stateDirty=true;
      }
      if(m.type==='attributes'&&m.target.id==='globalAudioDock')stateDirty=true;
    }
    if(stateDirty)queueSync();
  });

  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  scan();
  queueSync();
})();