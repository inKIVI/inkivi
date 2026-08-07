(()=>{
  const clampVolume=v=>Math.max(0,Math.min(100,Number.isFinite(Number(v))?Number(v):82));
  let volume=clampVolume(localStorage.getItem('inkiviVolume')??82);
  let seq=0,active=null,scWidget=null,scApiPromise=null,scDuration=0,scLoadedUrl='',scReady=false;
  const playIcon='<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  const pauseIcon='<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>';
  const fmt=n=>!Number.isFinite(n)?'0:00':Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');
  const dock=()=>document.getElementById('globalAudioDock');
  const audio=()=>dock()?.querySelector('audio');
  const frame=()=>dock()?.querySelector('.scEngine');
  const playButton=()=>dock()?.querySelector('.dockPlay');
  const label=()=>dock()?.querySelector('.dockLabel');
  const fill=()=>dock()?.querySelector('.dockProgress i');
  const time=()=>dock()?.querySelector('.dockTime');
  const volumeInput=()=>dock()?.querySelector('.dockVolume input');

  function setPlaying(on){const d=dock();if(!d)return;d.classList.toggle('playing',!!on);const p=playButton();if(p)p.innerHTML=on?pauseIcon:playIcon;document.querySelectorAll('.releaseCard.is-playing').forEach(c=>c.classList.remove('is-playing'));if(on)active?.button?.closest('.releaseCard')?.classList.add('is-playing')}
  function clearActiveClasses(){document.querySelectorAll('.trackPlay.active,.heroPlayStrip.active').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.releaseCard.is-active,.releaseCard.is-playing').forEach(x=>x.classList.remove('is-active','is-playing'))}
  function setActiveClasses(button){clearActiveClasses();button?.classList.add('active');button?.closest('.releaseCard')?.classList.add('is-active')}
  function stopNative(reset=true){const a=audio();if(!a)return;try{a.pause()}catch{}if(reset){try{a.currentTime=0}catch{}a.removeAttribute('src');try{a.load()}catch{}}}
  function stopSC(){if(scWidget)try{scWidget.pause()}catch{}}
  function stopAll(reset=true){seq++;stopNative(reset);stopSC();setPlaying(false)}
  function setMeta(title,cover,status='загрузка…'){const d=dock();if(!d)return;d.hidden=false;document.body.classList.add('audioDockOpen');const t=d.querySelector('.dockTitle');if(t)t.textContent=title||'—';if(label())label().textContent=status;if(fill())fill().style.width='0%';if(time())time().textContent='0:00 / 0:00';const img=d.querySelector('.dockCover');if(img){if(cover){img.src=cover;img.hidden=false;img.onerror=()=>img.hidden=true}else img.hidden=true}}
  function setRowStatus(button,status){const el=button?.closest('.trackLite')?.querySelector(':scope > span:last-child');if(el&&el.textContent!==status)el.textContent=status}

  function loadSCAPI(){if(window.SC?.Widget)return Promise.resolve();if(scApiPromise)return scApiPromise;scApiPromise=new Promise((resolve,reject)=>{const old=[...document.scripts].find(s=>/w\.soundcloud\.com\/player\/api\.js/.test(s.src));if(old){if(window.SC?.Widget){resolve();return}old.addEventListener('load',resolve,{once:true});old.addEventListener('error',reject,{once:true});return}const s=document.createElement('script');s.src='https://w.soundcloud.com/player/api.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});return scApiPromise}
  function applyVolumeEverywhere(){const a=audio();if(a)a.volume=volume/100;const v=volumeInput();if(v&&Number(v.value)!==volume)v.value=String(volume);if(scWidget)try{scWidget.setVolume(volume)}catch{}}

  async function startPreview(token){if(token!==seq||!active)return false;const a=audio();if(!a||!active.preview){if(label())label().textContent='audio недоступно';setRowStatus(active?.button,'нет audio');setPlaying(false);return false}stopSC();active.mode='preview';a.volume=volume/100;a.src=active.preview;a.dataset.url=active.preview;if(label())label().textContent='preview';setRowStatus(active.button,'preview');try{await a.play();if(token!==seq){a.pause();return false}a.volume=volume/100;setPlaying(true);return true}catch{if(token===seq){if(label())label().textContent='preview недоступно';setPlaying(false)}return false}}

  function bindSoundCloudEvents(token,finish){
    if(!scWidget||!window.SC?.Widget)return;
    const E=window.SC.Widget.Events;
    for(const ev of[E.PLAY,E.PLAY_PROGRESS,E.PAUSE,E.FINISH])try{scWidget.unbind(ev)}catch{}
    scWidget.bind(E.PLAY,()=>{if(token!==seq){try{scWidget.pause()}catch{};return}try{scWidget.setVolume(volume)}catch{}stopNative(false);active.mode='soundcloud';if(label())label().textContent='soundcloud · full';setRowStatus(active.button,'full');setPlaying(true);finish(true)});
    scWidget.bind(E.PLAY_PROGRESS,e=>{if(token!==seq||active?.mode!=='soundcloud')return;const dur=scDuration||Number(e.duration)||0,pos=Number(e.currentPosition)||0;if(fill())fill().style.width=(dur?Math.min(1,pos/dur):0)*100+'%';if(time())time().textContent=fmt(pos/1000)+' / '+fmt(dur/1000)});
    scWidget.bind(E.PAUSE,()=>{if(token===seq&&active?.mode==='soundcloud')setPlaying(false)});
    scWidget.bind(E.FINISH,()=>{if(token===seq&&active?.mode==='soundcloud')setPlaying(false)});
  }

  async function startSoundCloud(token){
    if(token!==seq||!active?.soundcloud)return false;
    try{await loadSCAPI()}catch{return false}
    if(token!==seq)return false;
    const f=frame();if(!f)return false;
    const url=active.soundcloud,index=Math.max(0,Number(active.scIndex)||0);
    return new Promise(resolve=>{
      let settled=false;
      const finish=ok=>{if(settled)return;settled=true;resolve(ok)};
      const startCurrent=()=>{
        if(token!==seq||!scWidget){finish(false);return}
        bindSoundCloudEvents(token,finish);
        try{scWidget.setVolume(volume)}catch{}
        try{scWidget.getDuration(ms=>{if(token===seq)scDuration=Number(ms)||0})}catch{}
        try{scWidget.pause()}catch{}
        try{scWidget.skip(index)}catch{}
        setTimeout(()=>{if(token!==seq){finish(false);return}try{scWidget.setVolume(volume);scWidget.play()}catch{finish(false)}},100);
      };

      if(scWidget&&scReady&&scLoadedUrl===url){
        startCurrent();
        setTimeout(()=>finish(false),3000);
        return;
      }

      scReady=false;scLoadedUrl='';
      const playerUrl='https://w.soundcloud.com/player/?'+new URLSearchParams({url,auto_play:'false',hide_related:'true',show_comments:'false',show_user:'false',show_reposts:'false',visual:'false',buying:'false',sharing:'false',download:'false'}).toString();
      f.onload=()=>{
        if(token!==seq){finish(false);return}
        try{scWidget=window.SC.Widget(f)}catch{finish(false);return}
        try{scWidget.unbind(window.SC.Widget.Events.READY)}catch{}
        scWidget.bind(window.SC.Widget.Events.READY,()=>{
          if(token!==seq){try{scWidget.pause()}catch{};finish(false);return}
          scReady=true;scLoadedUrl=url;startCurrent();
        });
      };
      f.src=playerUrl;
      setTimeout(()=>finish(false),8000);
    })
  }

  async function playFromButton(button){
    const title=button.dataset.title||button.querySelector('span')?.textContent||document.getElementById('releaseTitle')?.textContent||'трек';
    const preview=button.dataset.preview||'',soundcloud=button.dataset.sc||'',cover=button.dataset.cover||document.getElementById('heroReleaseCover')?.src||'',scIndex=button.dataset.scIndex||0;
    stopAll(true);const token=seq;active={button,title,preview,soundcloud,cover,scIndex,mode:''};setActiveClasses(button);setMeta(title,cover,'загрузка…');applyVolumeEverywhere();setRowStatus(button,'загрузка…');
    if(soundcloud){if(label())label().textContent=scReady&&scLoadedUrl===soundcloud?'soundcloud · переключение…':'soundcloud · загрузка…';const ok=await startSoundCloud(token);if(token!==seq)return;if(ok)return;stopSC()}
    await startPreview(token)
  }

  function bindDock(){
    const d=dock();if(!d||d.dataset.playerV2==='1')return;d.dataset.playerV2='1';const oldPlay=d.querySelector('.dockPlay'),oldClose=d.querySelector('.dockClose'),oldVol=d.querySelector('.dockVolume input'),oldBar=d.querySelector('.dockProgress');if(!oldPlay||!oldClose||!oldVol||!oldBar)return;
    const p=oldPlay.cloneNode(true);oldPlay.replaceWith(p);const c=oldClose.cloneNode(true);oldClose.replaceWith(c);const v=oldVol.cloneNode(true);oldVol.replaceWith(v);const b=oldBar.cloneNode(true);oldBar.replaceWith(b);v.value=String(volume);applyVolumeEverywhere();
    v.oninput=()=>{volume=clampVolume(v.value);localStorage.setItem('inkiviVolume',String(volume));applyVolumeEverywhere()};
    p.onclick=()=>{if(!active)return;if(active.mode==='soundcloud'&&scWidget){try{scWidget.isPaused(paused=>{if(paused){scWidget.setVolume(volume);scWidget.play()}else scWidget.pause()})}catch{}return}const a=audio();if(!a)return;if(a.paused){a.volume=volume/100;a.play().then(()=>{a.volume=volume/100;setPlaying(true)}).catch(()=>{})}else{a.pause();setPlaying(false)}};
    b.onpointerdown=e=>{const r=b.getBoundingClientRect(),x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));if(active?.mode==='soundcloud'&&scWidget){try{scWidget.seekTo(x*(scDuration||0))}catch{};return}const a=audio();if(a&&Number.isFinite(a.duration))a.currentTime=x*a.duration};
    c.onclick=()=>{stopAll(true);active=null;clearActiveClasses();d.hidden=true;document.body.classList.remove('audioDockOpen')};
    const a=audio();if(a){a.volume=volume/100;a.ontimeupdate=()=>{if(active?.mode!=='preview')return;const dur=a.duration||0,pc=dur?Math.min(1,a.currentTime/dur):0;if(fill())fill().style.width=(pc*100)+'%';if(time())time().textContent=fmt(a.currentTime)+' / '+fmt(dur)};a.onloadedmetadata=()=>a.volume=volume/100;a.onplay=()=>a.volume=volume/100;a.onended=()=>setPlaying(false);a.onvolumechange=()=>{if(Math.abs(a.volume-volume/100)>.01)a.volume=volume/100}}
  }

  document.addEventListener('click',e=>{const button=e.target.closest?.('.trackPlay,.heroPlayStrip');if(!button||button.disabled)return;e.preventDefault();e.stopImmediatePropagation();bindDock();playFromButton(button)},true);
  function init(){bindDock()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));else setTimeout(init,0);
})();
