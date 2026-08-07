(()=>{
  const clamp=v=>Math.max(0,Math.min(100,Number.isFinite(Number(v))?Number(v):82));
  let volume=clamp(localStorage.getItem('inkiviVolume')??82);
  let requestId=0,active=null,scWidget=null,scApiPromise=null,scLoadedUrl='',scReady=false,scDuration=0;
  let pendingPlay=null,pendingReady=null;

  const PLAY='<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  const PAUSE='<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>';
  const fmt=n=>!Number.isFinite(n)?'0:00':Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');
  const dock=()=>document.getElementById('globalAudioDock');
  const audio=()=>dock()?.querySelector('audio');
  const frame=()=>dock()?.querySelector('.scEngine');
  const label=()=>dock()?.querySelector('.dockLabel');
  const fill=()=>dock()?.querySelector('.dockProgress i');
  const time=()=>dock()?.querySelector('.dockTime');
  const volInput=()=>dock()?.querySelector('.dockVolume input');

  function setPlaying(on){
    const d=dock();if(!d)return;
    d.classList.toggle('playing',!!on);
    const p=d.querySelector('.dockPlay');if(p)p.innerHTML=on?PAUSE:PLAY;
    document.querySelectorAll('.releaseCard.is-playing').forEach(x=>x.classList.remove('is-playing'));
    if(on)active?.button?.closest('.releaseCard')?.classList.add('is-playing');
  }
  function setClasses(button){
    document.querySelectorAll('.trackPlay.active,.heroPlayStrip.active').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.releaseCard.is-active,.releaseCard.is-playing').forEach(x=>x.classList.remove('is-active','is-playing'));
    button?.classList.add('active');button?.closest('.releaseCard')?.classList.add('is-active');
  }
  function rowStatus(button,text){const el=button?.closest('.trackLite')?.querySelector(':scope > span:last-child');if(el)el.textContent=text}
  function meta(title,cover,status){
    const d=dock();if(!d)return;d.hidden=false;document.body.classList.add('audioDockOpen');
    d.querySelector('.dockTitle').textContent=title||'—';label().textContent=status;fill().style.width='0%';time().textContent='0:00 / 0:00';
    const img=d.querySelector('.dockCover');if(cover){img.src=cover;img.hidden=false;img.onerror=()=>img.hidden=true}else img.hidden=true;
  }
  function stopNative(reset=true){const a=audio();if(!a)return;try{a.pause()}catch{}if(reset){try{a.currentTime=0}catch{}a.removeAttribute('src');try{a.load()}catch{}}}
  function stopSC(){if(scWidget)try{scWidget.pause()}catch{}}
  function applyVolume(){const a=audio();if(a)a.volume=volume/100;const v=volInput();if(v)v.value=String(volume);if(scWidget)try{scWidget.setVolume(volume)}catch{}}
  function cancelPending(){
    if(pendingPlay){clearTimeout(pendingPlay.timer);pendingPlay.resolve(false);pendingPlay=null}
    if(pendingReady){clearTimeout(pendingReady.timer);pendingReady.resolve(false);pendingReady=null}
  }

  function loadSCAPI(){
    if(window.SC?.Widget)return Promise.resolve();
    if(scApiPromise)return scApiPromise;
    scApiPromise=new Promise((resolve,reject)=>{
      const old=[...document.scripts].find(s=>/w\.soundcloud\.com\/player\/api\.js/.test(s.src));
      if(old){if(window.SC?.Widget)return resolve();old.addEventListener('load',resolve,{once:true});old.addEventListener('error',reject,{once:true});return}
      const s=document.createElement('script');s.src='https://w.soundcloud.com/player/api.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
    });
    return scApiPromise;
  }

  function bindWidgetEvents(){
    if(!scWidget||scWidget.__inkiviV3)return;
    scWidget.__inkiviV3=true;
    const E=window.SC.Widget.Events;
    scWidget.bind(E.READY,()=>{
      scReady=true;
      try{scWidget.setVolume(volume)}catch{}
      if(pendingReady){clearTimeout(pendingReady.timer);pendingReady.resolve(true);pendingReady=null}
    });
    scWidget.bind(E.PLAY,()=>{
      if(!active||active.mode!=='soundcloud-pending')return;
      try{scWidget.setVolume(volume)}catch{}
      stopNative(false);
      active.mode='soundcloud';
      label().textContent='soundcloud · full';rowStatus(active.button,'full');setPlaying(true);
      try{scWidget.getDuration(ms=>{scDuration=Number(ms)||0})}catch{}
      if(pendingPlay){clearTimeout(pendingPlay.timer);pendingPlay.resolve(true);pendingPlay=null}
    });
    scWidget.bind(E.PLAY_PROGRESS,e=>{
      if(active?.mode!=='soundcloud')return;
      const dur=scDuration||Number(e.duration)||0,pos=Number(e.currentPosition)||0;
      fill().style.width=(dur?Math.min(1,pos/dur):0)*100+'%';time().textContent=fmt(pos/1000)+' / '+fmt(dur/1000);
    });
    scWidget.bind(E.PAUSE,()=>{if(active?.mode==='soundcloud')setPlaying(false)});
    scWidget.bind(E.FINISH,()=>{if(active?.mode==='soundcloud')setPlaying(false)});
  }

  async function ensureSoundCloud(url,id){
    try{await loadSCAPI()}catch{return false}
    if(id!==requestId)return false;
    const f=frame();if(!f)return false;
    if(scWidget&&scReady&&scLoadedUrl===url)return true;

    scReady=false;scLoadedUrl=url;
    f.src='https://w.soundcloud.com/player/?'+new URLSearchParams({url,auto_play:'false',hide_related:'true',show_comments:'false',show_user:'false',show_reposts:'false',visual:'false',buying:'false',sharing:'false',download:'false'}).toString();
    try{scWidget=window.SC.Widget(f);bindWidgetEvents()}catch{return false}

    return new Promise(resolve=>{
      const timer=setTimeout(()=>{if(pendingReady?.resolve===resolve)pendingReady=null;resolve(false)},7000);
      pendingReady={resolve,timer};
      // READY can fire very quickly before the promise is installed.
      setTimeout(()=>{if(scReady&&pendingReady?.resolve===resolve){clearTimeout(timer);pendingReady=null;resolve(true)}},0);
    });
  }

  async function playSoundCloud(id){
    if(id!==requestId||!active?.soundcloud)return false;
    const ok=await ensureSoundCloud(active.soundcloud,id);if(!ok||id!==requestId)return false;
    active.mode='soundcloud-pending';
    try{scWidget.setVolume(volume)}catch{}
    const index=Math.max(0,Number(active.scIndex)||0);

    return new Promise(resolve=>{
      const timer=setTimeout(()=>{if(pendingPlay?.resolve===resolve)pendingPlay=null;resolve(false)},3500);
      pendingPlay={resolve,timer};
      const go=()=>{
        if(id!==requestId){clearTimeout(timer);pendingPlay=null;resolve(false);return}
        try{scWidget.setVolume(volume)}catch{}
        try{scWidget.play()}catch{clearTimeout(timer);pendingPlay=null;resolve(false)}
      };
      // For playlists, skip first, then play. For a single-track URL index is always 0.
      if(index>0){
        try{scWidget.skip(index)}catch{}
        setTimeout(go,120);
      }else{
        try{scWidget.seekTo(0)}catch{}
        setTimeout(go,60);
      }
    });
  }

  async function playPreview(id){
    if(id!==requestId||!active)return false;
    const a=audio();if(!a||!active.preview){label().textContent='audio недоступно';rowStatus(active.button,'нет audio');setPlaying(false);return false}
    stopSC();active.mode='preview';a.src=active.preview;a.volume=volume/100;label().textContent='preview';rowStatus(active.button,'preview');
    try{await a.play();if(id!==requestId){a.pause();return false}a.volume=volume/100;setPlaying(true);return true}catch{if(id===requestId){label().textContent='preview недоступно';setPlaying(false)}return false}
  }

  async function choose(button){
    requestId++;const id=requestId;cancelPending();stopNative(true);stopSC();setPlaying(false);
    const title=button.dataset.title||button.querySelector('span')?.textContent||document.getElementById('releaseTitle')?.textContent||'трек';
    active={button,title,preview:button.dataset.preview||'',soundcloud:button.dataset.sc||'',cover:button.dataset.cover||document.getElementById('heroReleaseCover')?.src||'',scIndex:button.dataset.scIndex||0,mode:''};
    setClasses(button);meta(title,active.cover,active.soundcloud?(scReady&&scLoadedUrl===active.soundcloud?'soundcloud · переключение…':'soundcloud · загрузка…'):'preview · загрузка…');rowStatus(button,'загрузка…');applyVolume();
    if(active.soundcloud){const full=await playSoundCloud(id);if(id!==requestId)return;if(full)return;stopSC()}
    await playPreview(id);
  }

  function bindDock(){
    const d=dock();if(!d||d.dataset.playerV3==='1')return;d.dataset.playerV3='1';
    const op=d.querySelector('.dockPlay'),oc=d.querySelector('.dockClose'),ov=d.querySelector('.dockVolume input'),ob=d.querySelector('.dockProgress');if(!op||!oc||!ov||!ob)return;
    const p=op.cloneNode(true);op.replaceWith(p);const c=oc.cloneNode(true);oc.replaceWith(c);const v=ov.cloneNode(true);ov.replaceWith(v);const b=ob.cloneNode(true);ob.replaceWith(b);v.value=String(volume);applyVolume();
    v.oninput=()=>{volume=clamp(v.value);localStorage.setItem('inkiviVolume',String(volume));applyVolume()};
    p.onclick=()=>{if(!active)return;if(active.mode==='soundcloud'&&scWidget){try{scWidget.isPaused(paused=>{if(paused){scWidget.setVolume(volume);scWidget.play()}else scWidget.pause()})}catch{}return}const a=audio();if(!a)return;if(a.paused){a.volume=volume/100;a.play().then(()=>setPlaying(true)).catch(()=>{})}else{a.pause();setPlaying(false)}};
    b.onpointerdown=e=>{const r=b.getBoundingClientRect(),x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));if(active?.mode==='soundcloud'&&scWidget){try{scWidget.seekTo(x*(scDuration||0))}catch{}return}const a=audio();if(a&&Number.isFinite(a.duration))a.currentTime=x*a.duration};
    c.onclick=()=>{requestId++;cancelPending();stopNative(true);stopSC();active=null;setClasses(null);d.hidden=true;document.body.classList.remove('audioDockOpen')};
    const a=audio();if(a){a.volume=volume/100;a.ontimeupdate=()=>{if(active?.mode!=='preview')return;const dur=a.duration||0,pc=dur?Math.min(1,a.currentTime/dur):0;fill().style.width=(pc*100)+'%';time().textContent=fmt(a.currentTime)+' / '+fmt(dur)};a.onloadedmetadata=()=>a.volume=volume/100;a.onplay=()=>a.volume=volume/100;a.onended=()=>setPlaying(false)}
  }

  document.addEventListener('click',e=>{const b=e.target.closest?.('.trackPlay,.heroPlayStrip');if(!b||b.disabled)return;e.preventDefault();e.stopImmediatePropagation();bindDock();choose(b)},true);
  function init(){bindDock();loadSCAPI().catch(()=>{})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));else setTimeout(init,0);
})();
