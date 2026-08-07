(()=>{
const clamp=v=>Math.max(0,Math.min(100,Number.isFinite(Number(v))?Number(v):82));
let volume=clamp(localStorage.getItem('inkiviVolume')??82);
let requestId=0,active=null,scWidget=null,scApiPromise=null,scReady=false,scLoadedUrl='',scDuration=0;
let readyWait=null,playWait=null;
const catalogCache=new Map();
const PLAY='<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
const PAUSE='<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>';
const fmt=n=>!Number.isFinite(n)?'0:00':Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');
const norm=s=>String(s||'').toLowerCase().replace(/^inkivi\s*[-—–:]\s*/i,'').replace(/\s*[\[(](feat\.?|ft\.?)[^\])]*[\])]/gi,'').replace(/\s+(feat\.?|ft\.?)\s+.+$/gi,'').replace(/[^a-zа-яё0-9]+/gi,' ').trim();
const tokens=s=>new Set(norm(s).split(/\s+/).filter(Boolean));
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
  const t=d.querySelector('.dockTitle');if(t)t.textContent=title||'—';if(label())label().textContent=status;
  if(fill())fill().style.width='0%';if(time())time().textContent='0:00 / 0:00';
  const img=d.querySelector('.dockCover');if(cover){img.src=cover;img.hidden=false;img.onerror=()=>img.hidden=true}else img.hidden=true;
}
function stopNative(reset=true){const a=audio();if(!a)return;try{a.pause()}catch{}if(reset){try{a.currentTime=0}catch{}a.removeAttribute('src');try{a.load()}catch{}}}
function stopSC(){if(scWidget)try{scWidget.pause()}catch{}}
function applyVolume(){const a=audio();if(a)a.volume=volume/100;const v=volInput();if(v)v.value=String(volume);if(scWidget)try{scWidget.setVolume(volume)}catch{}}
function cancelWaiters(){
  if(readyWait){clearTimeout(readyWait.timer);readyWait.resolve(false);readyWait=null}
  if(playWait){clearTimeout(playWait.timer);playWait.resolve(false);playWait=null}
}
function loadSCAPI(){
  if(window.SC?.Widget)return Promise.resolve();if(scApiPromise)return scApiPromise;
  scApiPromise=new Promise((resolve,reject)=>{const old=[...document.scripts].find(s=>/w\.soundcloud\.com\/player\/api\.js/.test(s.src));if(old){if(window.SC?.Widget)return resolve();old.addEventListener('load',resolve,{once:true});old.addEventListener('error',reject,{once:true});return}const s=document.createElement('script');s.src='https://w.soundcloud.com/player/api.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
  return scApiPromise;
}
function bindEvents(){
  if(!scWidget||scWidget.__inkiviResolved)return;scWidget.__inkiviResolved=true;const E=window.SC.Widget.Events;
  scWidget.bind(E.READY,()=>{scReady=true;try{scWidget.setVolume(volume)}catch{};if(readyWait){clearTimeout(readyWait.timer);readyWait.resolve(true);readyWait=null}});
  scWidget.bind(E.PLAY,()=>{if(!active||!String(active.mode).startsWith('soundcloud'))return;try{scWidget.setVolume(volume)}catch{};stopNative(false);active.mode='soundcloud';if(label())label().textContent='soundcloud · full';rowStatus(active.button,'full');setPlaying(true);try{scWidget.getDuration(ms=>{scDuration=Number(ms)||0})}catch{};if(playWait){clearTimeout(playWait.timer);playWait.resolve(true);playWait=null}});
  scWidget.bind(E.PLAY_PROGRESS,e=>{if(active?.mode!=='soundcloud')return;const dur=scDuration||Number(e.duration)||0,pos=Number(e.currentPosition)||0;if(fill())fill().style.width=(dur?Math.min(1,pos/dur):0)*100+'%';if(time())time().textContent=fmt(pos/1000)+' / '+fmt(dur/1000)});
  scWidget.bind(E.PAUSE,()=>{if(active?.mode==='soundcloud')setPlaying(false)});
  scWidget.bind(E.FINISH,()=>{if(active?.mode==='soundcloud')setPlaying(false)});
  scWidget.bind(E.ERROR,()=>{if(readyWait){clearTimeout(readyWait.timer);readyWait.resolve(false);readyWait=null}if(playWait){clearTimeout(playWait.timer);playWait.resolve(false);playWait=null}});
}
async function initWidget(id){
  try{await loadSCAPI()}catch{return false}if(id!==requestId)return false;
  if(scWidget)return true;
  const f=frame();if(!f)return false;
  f.src='https://w.soundcloud.com/player/?'+new URLSearchParams({url:'https://soundcloud.com',auto_play:'false',hide_related:'true',show_comments:'false',show_user:'false',show_reposts:'false',visual:'false',buying:'false',sharing:'false',download:'false'}).toString();
  try{scWidget=window.SC.Widget(f);bindEvents();return true}catch{return false}
}
function getSounds(){return new Promise(resolve=>{if(!scWidget){resolve([]);return}try{scWidget.getSounds(s=>resolve(Array.isArray(s)?s:[]))}catch{resolve([])}})}
function loadIntoWidget(url,id,timeout=9000){
  return new Promise(async resolve=>{
    if(!await initWidget(id)||id!==requestId)return resolve(false);
    let done=false;const finish=ok=>{if(done)return;done=true;if(readyWait?.resolve===finish)readyWait=null;resolve(ok)};
    const timer=setTimeout(()=>finish(false),timeout);readyWait={resolve:finish,timer};scReady=false;
    try{scWidget.load(url,{auto_play:false,hide_related:true,show_comments:false,show_user:false,show_reposts:false,visual:false,buying:false,sharing:false,download:false,callback:()=>{scReady=true;scLoadedUrl=url;try{scWidget.setVolume(volume)}catch{};finish(id===requestId)}})}catch{clearTimeout(timer);finish(false)}
  });
}
function scoreSound(title,sound){
  const a=norm(title),b=norm(sound?.title||sound?.permalink||'');if(!a||!b)return 0;if(a===b)return 100;if(a.includes(b)||b.includes(a))return 80;
  const A=tokens(a),B=tokens(b);if(!A.size||!B.size)return 0;let hit=0;A.forEach(x=>{if(B.has(x))hit++});return 60*hit/Math.max(A.size,B.size);
}
function findSound(title,sounds,fallbackIndex){
  let best=null,bestScore=0;
  sounds.forEach((s,i)=>{const score=scoreSound(title,s);if(score>bestScore){bestScore=score;best={sound:s,index:i}}});
  if(best&&bestScore>=45)return best;
  const i=Math.max(0,Number(fallbackIndex)||0);return sounds[i]?{sound:sounds[i],index:i}:null;
}
async function resolveTrackUrl(setUrl,title,fallbackIndex,id){
  let sounds=catalogCache.get(setUrl);
  if(!sounds){
    if(!await loadIntoWidget(setUrl,id,10000)||id!==requestId)return null;
    sounds=await getSounds();if(id!==requestId)return null;
    if(!sounds.length)return null;
    catalogCache.set(setUrl,sounds);
  }
  const match=findSound(title,sounds,fallbackIndex);if(!match)return null;
  const direct=match.sound?.permalink_url||match.sound?.uri||'';
  return direct?{url:direct,index:match.index}:null;
}
async function playSoundCloud(id){
  if(id!==requestId||!active?.soundcloud)return false;
  const resolved=await resolveTrackUrl(active.soundcloud,active.title,active.scIndex,id);if(!resolved||id!==requestId)return false;
  active.mode='soundcloud-pending';
  if(label())label().textContent='soundcloud · загрузка…';
  if(!await loadIntoWidget(resolved.url,id,9000)||id!==requestId)return false;
  return new Promise(resolve=>{
    const finish=ok=>{if(playWait?.resolve===finish)playWait=null;resolve(ok)};
    const timer=setTimeout(()=>{if(playWait?.resolve===finish)playWait=null;resolve(false)},7000);playWait={resolve:finish,timer};
    try{scWidget.setVolume(volume);scWidget.seekTo(0);scWidget.play()}catch{clearTimeout(timer);playWait=null;resolve(false)}
  });
}
async function playPreview(id){
  if(id!==requestId||!active)return false;const a=audio();if(!a||!active.preview){if(label())label().textContent='audio недоступно';rowStatus(active.button,'нет audio');setPlaying(false);return false}
  stopSC();active.mode='preview';a.src=active.preview;a.volume=volume/100;if(label())label().textContent='preview';rowStatus(active.button,'preview');
  try{await a.play();if(id!==requestId){a.pause();return false}a.volume=volume/100;setPlaying(true);return true}catch{if(id===requestId){if(label())label().textContent='preview недоступно';setPlaying(false)}return false}
}
async function choose(button){
  requestId++;const id=requestId;cancelWaiters();stopNative(true);stopSC();setPlaying(false);
  const title=button.dataset.title||button.querySelector('span')?.textContent||document.getElementById('releaseTitle')?.textContent||'трек';
  active={button,title,preview:button.dataset.preview||'',soundcloud:button.dataset.sc||'',cover:button.dataset.cover||document.getElementById('heroReleaseCover')?.src||'',scIndex:button.dataset.scIndex||0,mode:''};
  setClasses(button);meta(title,active.cover,active.soundcloud?'soundcloud · загрузка…':'preview · загрузка…');rowStatus(button,'загрузка…');applyVolume();
  if(active.soundcloud){const full=await playSoundCloud(id);if(id!==requestId)return;if(full)return;stopSC()}
  await playPreview(id);
}
function bindDock(){
  const d=dock();if(!d||d.dataset.playerResolved==='1')return;d.dataset.playerResolved='1';
  const op=d.querySelector('.dockPlay'),oc=d.querySelector('.dockClose'),ov=d.querySelector('.dockVolume input'),ob=d.querySelector('.dockProgress');if(!op||!oc||!ov||!ob)return;
  const p=op.cloneNode(true);op.replaceWith(p);const c=oc.cloneNode(true);oc.replaceWith(c);const v=ov.cloneNode(true);ov.replaceWith(v);const b=ob.cloneNode(true);ob.replaceWith(b);v.value=String(volume);applyVolume();
  v.oninput=()=>{volume=clamp(v.value);localStorage.setItem('inkiviVolume',String(volume));applyVolume()};
  p.onclick=()=>{if(!active)return;if(String(active.mode).startsWith('soundcloud')&&scWidget){try{scWidget.isPaused(paused=>{if(paused){scWidget.setVolume(volume);scWidget.play()}else scWidget.pause()})}catch{}return}const a=audio();if(!a)return;if(a.paused){a.volume=volume/100;a.play().then(()=>setPlaying(true)).catch(()=>{})}else{a.pause();setPlaying(false)}};
  b.onpointerdown=e=>{const r=b.getBoundingClientRect(),x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));if(active?.mode==='soundcloud'&&scWidget){try{scWidget.seekTo(x*(scDuration||0))}catch{}return}const a=audio();if(a&&Number.isFinite(a.duration))a.currentTime=x*a.duration};
  c.onclick=()=>{requestId++;cancelWaiters();stopNative(true);stopSC();active=null;setClasses(null);d.hidden=true;document.body.classList.remove('audioDockOpen')};
  const a=audio();if(a){a.volume=volume/100;a.ontimeupdate=()=>{if(active?.mode!=='preview')return;const dur=a.duration||0,pc=dur?Math.min(1,a.currentTime/dur):0;if(fill())fill().style.width=(pc*100)+'%';if(time())time().textContent=fmt(a.currentTime)+' / '+fmt(dur)};a.onloadedmetadata=()=>a.volume=volume/100;a.onplay=()=>{a.volume=volume/100;setPlaying(true)};a.onpause=()=>{if(active?.mode==='preview')setPlaying(false)};a.onended=()=>setPlaying(false)}
}
document.addEventListener('click',e=>{const b=e.target.closest?.('.trackPlay,.heroPlayStrip');if(!b||b.disabled)return;e.preventDefault();e.stopImmediatePropagation();bindDock();choose(b)},true);
function init(){bindDock();loadSCAPI().catch(()=>{})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));else setTimeout(init,0);
})();