(()=>{
  const mobileCss=document.createElement('link');
  mobileCss.rel='stylesheet';
  mobileCss.href='./assets/mobile-fix.css?v=20260808';
  document.head.appendChild(mobileCss);

  const player=document.createElement('script');
  player.src='./assets/player-v2.js?v=20260808c';
  player.defer=true;
  document.head.appendChild(player);

  function syncCardState(){
    const dock=document.getElementById('globalAudioDock');
    const playing=!!dock?.classList.contains('playing');
    document.querySelectorAll('.releaseCard.is-active,.releaseCard.is-playing').forEach(card=>card.classList.remove('is-active','is-playing'));
    if(!playing)return;
    const active=document.querySelector('.trackPlay.active,.heroPlayStrip.active');
    const card=active?.closest('.releaseCard');
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

  const observer=new MutationObserver(mutations=>{
    let stateDirty=false;
    for(const m of mutations){
      if(m.type==='childList')m.addedNodes.forEach(n=>{if(n.nodeType===1)scan(n)});
      if(m.type==='attributes'&&m.target.id==='globalAudioDock')stateDirty=true;
    }
    if(stateDirty)syncCardState();
  });

  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  scan();
  syncCardState();
})();
