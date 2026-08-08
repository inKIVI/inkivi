(()=>{
  const mobileCss=document.createElement('link');
  mobileCss.rel='stylesheet';
  mobileCss.href='./assets/mobile-fix.css?v=20260808d';
  document.head.appendChild(mobileCss);

  const polishCss=document.createElement('link');
  polishCss.rel='stylesheet';
  polishCss.href='./assets/ui-polish.css?v=20260808c';
  document.head.appendChild(polishCss);

  const customCursor=document.createElement('script');
  customCursor.src='./assets/custom-cursor.js?v=20260808a';
  customCursor.defer=true;
  document.head.appendChild(customCursor);

  const player=document.createElement('script');
  player.src='./assets/player-v3.js?v=20260808g';
  player.defer=true;
  document.head.appendChild(player);

  const PLAY='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  const PAUSE='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>';
  const norm=s=>String(s||'').toLowerCase().replace(/^inkivi\s*[-—–:]\s*/i,'').replace(/\s*[\[(](feat\.?|ft\.?)[^\])]*[\])]/gi,'').replace(/\s+(feat\.?|ft\.?)\s+.+$/gi,'').replace(/[^a-zа-яё0-9]+/gi,' ').trim();

  function dock(){return document.getElementById('globalAudioDock')}
  function isPlaying(){return !!dock()?.classList.contains('playing')}
  function currentTitle(){return norm(dock()?.querySelector('.dockTitle')?.textContent)}

  function findReleaseTrackButton(){
    const title=currentTitle();
    if(!title)return null;
    const buttons=[...document.querySelectorAll('.releaseCard .trackPlay')];
    return buttons.find(b=>norm(b.dataset.title||b.textContent)===title)
      || buttons.find(b=>{const t=norm(b.dataset.title||b.textContent);return t&&(t.includes(title)||title.includes(t))})
      || null;
  }

  function syncDockIcon(){
    const btn=dock()?.querySelector('.dockPlay');
    if(btn)btn.innerHTML=isPlaying()?PAUSE:PLAY;
  }

  function syncTrackButtons(active){
    document.querySelectorAll('.releaseCard .trackPlay').forEach(btn=>{
      const on=!!active&&btn===active&&isPlaying();
      btn.innerHTML=on?PAUSE:PLAY;
      btn.classList.toggle('active',on);
      btn.setAttribute('aria-label',on?'пауза':'воспроизвести');
    });
  }

  function syncCardState(){
    syncDockIcon();
    document.querySelectorAll('.releaseCard.is-active,.releaseCard.is-playing').forEach(card=>card.classList.remove('is-active','is-playing'));

    const active=findReleaseTrackButton();
    syncTrackButtons(active);
    if(!active)return;

    const card=active.closest('.releaseCard');
    if(card)card.classList.add('is-active');
    if(isPlaying()&&card)card.classList.add('is-playing');
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
    let dirty=false;
    for(const m of mutations){
      if(m.type==='childList'){
        m.addedNodes.forEach(n=>{if(n.nodeType===1)scan(n)});
        if(m.addedNodes.length||m.removedNodes.length)dirty=true;
      }
      if(m.type==='attributes'&&m.target.id==='globalAudioDock')dirty=true;
    }
    if(dirty)queueSync();
  });

  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('click',e=>{if(e.target.closest?.('.trackPlay,.dockPlay,.dockClose'))setTimeout(queueSync,80)},true);
  scan();
  queueSync();
})();
