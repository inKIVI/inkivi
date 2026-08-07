(()=>{
  let expectedPreview='';
  let expectedSoundcloud='';
  let expectedMode='';
  let boundFrameSrc='';

  function nativeAudio(){return document.querySelector('#globalAudioDock audio')}
  function frame(){return document.querySelector('#globalAudioDock .scEngine')}
  function widget(){
    const f=frame();
    if(!f||!window.SC?.Widget)return null;
    try{return window.SC.Widget(f)}catch{return null}
  }
  function soundcloudUrlFromFrame(){
    const f=frame();
    if(!f?.src)return'';
    try{return new URL(f.src).searchParams.get('url')||''}catch{return''}
  }
  function stopNative(reset=false){
    const a=nativeAudio();
    if(!a)return;
    try{a.pause()}catch{}
    if(reset){
      try{a.currentTime=0}catch{}
      a.removeAttribute('src');
      try{a.load()}catch{}
    }
  }
  function stopSoundcloud(){
    const w=widget();
    if(w)try{w.pause()}catch{}
  }
  function hardStop(){
    stopNative(true);
    stopSoundcloud();
  }

  function syncCardState(){
    const dock=document.getElementById('globalAudioDock');
    const playing=!!dock?.classList.contains('playing');
    document.querySelectorAll('.releaseCard.is-active,.releaseCard.is-playing').forEach(card=>card.classList.remove('is-active','is-playing'));
    if(!playing)return;
    const active=document.querySelector('.trackPlay.active');
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

  /* Capture track switches before content-ui starts a new async SoundCloud request. */
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('.trackPlay');
    if(!b)return;
    expectedPreview=b.dataset.preview||'';
    expectedSoundcloud=b.dataset.sc||'';
    expectedMode=expectedSoundcloud?'soundcloud':'preview';
    hardStop();
    setTimeout(bindSoundcloudGuard,0);
  },true);

  /* A late fallback from the previously clicked track must never start. */
  document.addEventListener('play',e=>{
    const a=e.target;
    if(!(a instanceof HTMLMediaElement)||a.tagName!=='AUDIO')return;
    const actual=a.currentSrc||a.src||'';
    if(expectedPreview&&actual&&actual!==expectedPreview){
      try{a.pause();a.currentTime=0}catch{}
      return;
    }
    expectedMode='preview';
    stopSoundcloud();
  },true);

  function bindSoundcloudGuard(){
    const f=frame();
    if(!f||!window.SC?.Widget)return;
    const src=f.src||'';
    if(src===boundFrameSrc)return;
    boundFrameSrc=src;
    const w=widget();
    if(!w)return;
    try{
      w.bind(window.SC.Widget.Events.PLAY,()=>{
        const loaded=soundcloudUrlFromFrame();
        if(expectedSoundcloud&&loaded&&loaded!==expectedSoundcloud){
          try{w.pause()}catch{}
          return;
        }
        if(expectedMode==='preview'){
          try{w.pause()}catch{}
          return;
        }
        expectedMode='soundcloud';
        stopNative(false);
      });
    }catch{}
  }

  const observer=new MutationObserver(mutations=>{
    let stateDirty=false,scDirty=false;
    for(const m of mutations){
      if(m.type==='childList')m.addedNodes.forEach(n=>{if(n.nodeType===1)scan(n)});
      if(m.type==='attributes'&&m.target.id==='globalAudioDock')stateDirty=true;
      if(m.type==='attributes'&&m.target.classList?.contains('scEngine'))scDirty=true;
    }
    if(stateDirty)syncCardState();
    if(scDirty)setTimeout(bindSoundcloudGuard,0);
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','src']});

  const apiPoll=setInterval(()=>{
    if(window.SC?.Widget){bindSoundcloudGuard();clearInterval(apiPoll)}
  },250);
  setTimeout(()=>clearInterval(apiPoll),15000);

  scan();
  syncCardState();
})();
