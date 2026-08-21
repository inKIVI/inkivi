(()=>{
'use strict';

const SUPABASE_URL='https://ytckdpaegunralpxvmlx.supabase.co';
const SUPABASE_KEY='sb_publishable_oyJmCk-WH3ig_QTJlJh1vQ_wLICx0X0';
const PLAY='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
const PAUSE='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>';
const PLATFORM_ORDER=['spotify','apple','yandex','vk','youtube','soundcloud','deezer','tidal','amazon','bandcamp'];
const PLATFORM_NAMES={spotify:'spotify',apple:'apple music',yandex:'яндекс музыка',vk:'vk музыка',youtube:'youtube',soundcloud:'soundcloud',deezer:'deezer',tidal:'tidal',amazon:'amazon music',bandcamp:'bandcamp'};
const state={releases:[],visuals:[],current:null,target:null,active:null,playSeq:0,scWidget:null,scDuration:0,scScript:null,scCatalog:new Map(),scRetryAfter:0};

const $=id=>document.getElementById(id);
const q=(selector,root=document)=>root.querySelector(selector);
const qa=(selector,root=document)=>[...root.querySelectorAll(selector)];
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const withTimeout=(promise,ms,message='timeout')=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(message)),ms))]);
const norm=value=>String(value||'').toLowerCase().replace(/^inkivi\s*[-—–:]\s*/i,'').replace(/[^a-zа-яё0-9]+/gi,' ').trim();
const fmt=seconds=>!Number.isFinite(seconds)?'0:00':Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0');
const GLYPH_SELECTOR='h1,.release,.eyebrow,.zoneTitle,.panel h2,.unit b,.releaseInfo h3,.trackLite b,.dockTitle,.loader strong';

function splitGlyphs(element){
  const text=element.textContent||'';
  const glyphs=[...element.children];
  if(element.dataset.glyphText===text&&glyphs.length===[...text].length&&glyphs.every(glyph=>glyph.classList.contains('glyph')))return;
  element.textContent='';
  [...text].forEach(character=>{
    const glyph=document.createElement('span');
    glyph.className='glyph';
    glyph.setAttribute('aria-hidden','true');
    glyph.textContent=character;
    element.appendChild(glyph);
  });
  element.dataset.glyphText=text;
  element.setAttribute('aria-label',text);
}

let glyphRefreshFrame=0;
function refreshGlyphs(){
  if(glyphRefreshFrame)return;
  glyphRefreshFrame=requestAnimationFrame(()=>{
    glyphRefreshFrame=0;
    qa(GLYPH_SELECTOR).forEach(splitGlyphs);
  });
}

function initGlyphJitter(){
  refreshGlyphs();
  new MutationObserver(refreshGlyphs).observe(document.body,{subtree:true,childList:true,characterData:true});
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const twitch=()=>{
    const glyphs=qa('.glyph').filter(glyph=>glyph.parentElement?.matches(GLYPH_SELECTOR)&&glyph.isConnected&&glyph.getClientRects().length);
    const count=Math.min(glyphs.length,1+Math.floor(glyphs.length/55));
    for(let index=0;index<count;index++){
      const glyph=glyphs[Math.floor(Math.random()*glyphs.length)];
      if(!glyph)continue;
      const strength=.48+Math.random()*.78;
      const x=(Math.random()<.5?-1:1)*strength;
      const y=(Math.random()<.5?-1:1)*Math.random()*.82;
      glyph.style.transform=`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
      setTimeout(()=>{if(glyph.isConnected)glyph.style.transform='translate3d(0,0,0)'},42+Math.random()*72);
    }
    setTimeout(twitch,58+Math.random()*105);
  };
  setTimeout(twitch,240);
}

function safeUrl(value){
  if(!value)return'';
  try{
    const url=new URL(String(value),location.href);
    return ['http:','https:'].includes(url.protocol)?url.href:'';
  }catch{return''}
}

function formatDate(value){
  const date=new Date(value);
  return Number.isFinite(date.getTime())?date.toLocaleDateString('ru-RU',{day:'2-digit',month:'long',year:'numeric'}):'дата уточняется';
}

async function rest(table,order){
  const url=new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set('select','*');
  url.searchParams.set('published','eq.true');
  url.searchParams.set('order',order);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),5200);
  try{
    const response=await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`},signal:controller.signal});
    if(!response.ok)throw new Error(`${table}: ${response.status}`);
    return await response.json();
  }finally{clearTimeout(timer)}
}

function chooseCurrent(rows){
  const now=Date.now();
  const future=rows.filter(row=>new Date(row.release_date).getTime()>now).sort((a,b)=>new Date(a.release_date)-new Date(b.release_date));
  return future[0]||rows.slice().sort((a,b)=>new Date(b.release_date)-new Date(a.release_date))[0]||null;
}

function trackList(release){
  const list=Array.isArray(release?.tracklist)?release.tracklist.filter(Boolean):[];
  if(list.length)return list;
  return release?[{title:release.title,preview:release.platforms?.preview||''}]:[];
}

function firstValue(object,keys){
  for(const key of keys){const value=safeUrl(object?.[key]);if(value)return value}
  return'';
}

function audioSources(track,release){
  const direct=firstValue(track,['audio_url','audioUrl','stream_url','streamUrl','file_url','fileUrl','full_audio','audio']);
  const releaseDirect=trackList(release).length===1?firstValue(release?.platforms,['audio','audio_url','direct','stream','file','storage']):'';
  const preview=firstValue(track,['preview','previewUrl'])||safeUrl(release?.platforms?.preview);
  const soundcloud=safeUrl(release?.platforms?.soundcloud);
  const sources=[];
  if(direct||releaseDirect)sources.push({kind:'full',url:direct||releaseDirect,label:'full'});
  if(soundcloud)sources.push({kind:'soundcloud',url:soundcloud,label:'soundcloud'});
  if(preview&&!sources.some(item=>item.url===preview))sources.push({kind:'preview',url:preview,label:'preview'});
  return sources;
}

function loadImage(img,url,alt=''){
  const src=safeUrl(url);
  if(!img||!src){if(img)img.hidden=true;return Promise.resolve(false)}
  return new Promise(resolve=>{
    let settled=false;
    const finish=ok=>{if(settled)return;settled=true;clearTimeout(timer);img.hidden=!ok;if(ok)img.alt=alt;resolve(ok);window.inkiviVcrRefresh?.()};
    const timer=setTimeout(()=>finish(false),4500);
    img.onload=()=>finish(true);
    img.onerror=()=>finish(false);
    img.src=src;
    if(img.complete&&img.naturalWidth)finish(true);
  });
}

function setLink(anchor,url,label){
  const href=safeUrl(url);
  anchor.textContent=label;
  if(href){anchor.href=href;anchor.target='_blank';anchor.rel='noopener';anchor.removeAttribute('aria-disabled')}
  else{anchor.removeAttribute('href');anchor.removeAttribute('target');anchor.removeAttribute('rel');anchor.setAttribute('aria-disabled','true')}
}

function renderTimer(){
  const target=state.target?.getTime();
  const remaining=Number.isFinite(target)?Math.max(0,target-Date.now()):0;
  const values=[Math.floor(remaining/864e5),Math.floor(remaining/36e5)%24,Math.floor(remaining/6e4)%60,Math.floor(remaining/1e3)%60];
  const names=['дней','часов','минут','секунд'];
  $('timer').innerHTML=values.map((value,index)=>`<div class="unit"><b>${String(value).padStart(2,'0')}</b><span>${names[index]}</span></div>`).join('');
}

function setHeroButton(release){
  const button=$('heroPlayStrip');
  const track=trackList(release)[0];
  const sources=audioSources(track,release);
  if(!track||!sources.length){button.hidden=true;return}
  button.hidden=false;
  button.dataset.releaseId=release.id||'';
  button.dataset.trackIndex='0';
  button.innerHTML=PLAY+`<span>${esc(track.title||release.title)}</span>`;
}

async function renderHero(release){
  if(!release)return[];
  const isFuture=new Date(release.release_date).getTime()>Date.now();
  state.current=release;
  state.target=new Date(release.release_date);
  $('releaseMode').textContent=isFuture?'ближайший релиз':'последний релиз';
  $('releaseTitle').textContent=release.title||'без названия';
  $('releaseDateLabel').textContent=formatDate(release.release_date);
  setLink($('presave'),release.presave_url||release.source_url,isFuture?'сделать пресейв':'слушать релиз');
  setHeroButton(release);
  renderTimer();
  const cover=safeUrl(release.cover_url||release.platforms?.artwork);
  return [loadImage($('heroReleaseCover'),cover,`Обложка релиза ${release.title||''}`)];
}

function fallbackHero(){
  state.target=null;
  $('releaseMode').textContent='inkivi';
  $('releaseTitle').textContent='релизы и визуалы';
  $('releaseDateLabel').textContent='данные временно недоступны';
  $('heroReleaseCover').hidden=true;
  $('heroPlayStrip').hidden=true;
  setLink($('presave'),'','слушать релиз');
  renderTimer();
}

async function boot(){
  const started=performance.now();
  const fontReady=document.fonts?.load?withTimeout(document.fonts.load('400 16px "Inkivi VCR"'),4200,'font timeout').catch(()=>[]):Promise.resolve([]);
  let imageTasks=[];
  try{
    const [releases,visuals]=await withTimeout(Promise.all([rest('releases','release_date.desc'),rest('visuals','sort_order.asc,created_at.desc')]),5600,'data timeout');
    state.releases=Array.isArray(releases)?releases:[];
    state.visuals=Array.isArray(visuals)?visuals:[];
    imageTasks=await renderHero(chooseCurrent(state.releases));
    if(!state.current)fallbackHero();
  }catch(error){
    console.warn('Не удалось загрузить данные сайта:',error);
    fallbackHero();
    setTimeout(async()=>{
      try{
        const [releases,visuals]=await Promise.all([rest('releases','release_date.desc'),rest('visuals','sort_order.asc,created_at.desc')]);
        state.releases=Array.isArray(releases)?releases:[];
        state.visuals=Array.isArray(visuals)?visuals:[];
        const retries=await renderHero(chooseCurrent(state.releases));
        await Promise.allSettled(retries);
      }catch(retryError){console.warn('Повторная загрузка данных не удалась:',retryError)}
    },1800);
  }
  await Promise.allSettled([fontReady,...imageTasks.map(task=>withTimeout(task,4700,'image timeout').catch(()=>false))]);
  const elapsed=performance.now()-started;
  if(elapsed<520)await wait(520-elapsed);
  $('loader').classList.add('done');
  $('loader').setAttribute('aria-hidden','true');
  window.inkiviVcrRefresh?.();
}

let vcrTransitionFrame=0;
let vcrTransitionUntil=0;
function markVcrTransition(duration=480){
  vcrTransitionUntil=Math.max(vcrTransitionUntil,performance.now()+duration);
  document.documentElement.classList.add('vcrTransitioning');
  if(vcrTransitionFrame)return;
  const track=()=>{
    window.inkiviVcrRefresh?.();
    if(performance.now()<vcrTransitionUntil){vcrTransitionFrame=requestAnimationFrame(track);return}
    vcrTransitionFrame=0;
    vcrTransitionUntil=0;
    document.documentElement.classList.remove('vcrTransitioning');
    window.inkiviVcrRefresh?.();
  };
  vcrTransitionFrame=requestAnimationFrame(track);
}

function swap(from,to){
  if(document.body.dataset.transitioning==='1')return;
  document.body.dataset.transitioning='1';
  markVcrTransition(780);
  $('fade').classList.add('active');
  setTimeout(()=>{from.classList.add('off');to.classList.remove('off');scrollTo(0,0);window.inkiviVcrRefresh?.()},260);
  setTimeout(()=>$('fade').classList.remove('active'),420);
  setTimeout(()=>delete document.body.dataset.transitioning,820);
}

function platformLinks(release){
  const platforms=release.platforms||{};
  let links=PLATFORM_ORDER.filter(key=>safeUrl(platforms[key])).map(key=>`<a class="platformLink platform-${key}" target="_blank" rel="noopener" href="${esc(safeUrl(platforms[key]))}">${PLATFORM_NAMES[key]}</a>`).join('');
  const all=safeUrl(release.source_url||release.presave_url);
  if(all)links+=`<a class="platformLink allPlatforms" target="_blank" rel="noopener" href="${esc(all)}">все площадки</a>`;
  return links;
}

function trackRow(track,index,release){
  const title=track.title||track.trackName||`трек ${index+1}`;
  const sources=audioSources(track,release);
  const status=sources.some(item=>item.kind==='full'||item.kind==='soundcloud')?'full':sources.some(item=>item.kind==='preview')?'preview':'нет audio';
  return `<div class="trackLite"><span class="trackNo">${String(index+1).padStart(2,'0')}</span><button class="trackPlay" type="button" data-release-id="${esc(release.id||'')}" data-track-index="${index}" aria-label="Воспроизвести ${esc(title)}" ${sources.length?'':'disabled'}>${PLAY}</button><b>${esc(title)}</b><span>${status}</span></div>`;
}

function cdMarkup(cover,title){
  const url=safeUrl(cover);
  return `<div class="cdScene"><div class="cdDisc" aria-hidden="true"><span class="cdRing"></span><span class="cdLabel" data-art="${esc(url)}"></span></div><div class="cdCase">${url?`<img class="releaseCover" src="${esc(url)}" alt="${esc(title)}" loading="lazy">`:'<div class="releaseCoverFallback">inkivi</div>'}<span class="caseGlare"></span></div></div>`;
}

function releaseCard(release){
  const tracks=trackList(release);
  const multi=tracks.length>1;
  const cover=release.cover_url||release.platforms?.artwork||'';
  const player=multi?`<div class="albumCompact">${trackRow(tracks[0],0,release)}<button class="trackToggle" type="button" aria-expanded="false">треклист <span>${tracks.length} ↓</span></button><div class="trackDrawer" hidden>${tracks.map((track,index)=>trackRow(track,index,release)).join('')}</div></div>`:trackRow(tracks[0]||{title:release.title},0,release);
  return `<article class="releaseCard" data-release-id="${esc(release.id||'')}"><div class="releaseCoverBox">${cdMarkup(cover,release.title)}</div><div class="releaseRight"><div class="releaseInfo"><div><div class="releaseDateSmall"><span>${esc(multi?(tracks.length<=6?'ep':'album'):(release.type||'single'))}</span> · ${esc(formatDate(release.release_date))}</div><h3>${esc(release.title)}</h3></div><div class="platformRow">${platformLinks(release)}</div></div><div class="playerArea">${player}</div></div></article>`;
}

function hydrateRenderedMedia(root){
  qa('.cdLabel[data-art]',root).forEach(label=>{
    const art=safeUrl(label.dataset.art);
    if(art)label.style.setProperty('--cd-label-art',`url("${art.replace(/"/g,'%22')}")`);
  });
  qa('img',root).forEach(img=>{img.addEventListener('error',()=>{img.hidden=true;window.inkiviVcrRefresh?.()},{once:true})});
  window.inkiviVcrRefresh?.();
}

function tiktokId(url){return String(url||'').match(/\/video\/(\d+)/)?.[1]||''}
function youtubeId(url){return String(url||'').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/)?.[1]||''}

function visualCard(visual){
  const url=safeUrl(visual.url);
  const title=visual.title||visual.platform||'визуал';
  const tiktok=visual.platform==='tiktok'?tiktokId(url):'';
  if(tiktok)return `<article class="visualCard visualTikTok"><div class="visualMedia vcr-clean"><iframe class="tiktokFrame" loading="lazy" title="${esc(title)}" allow="encrypted-media;fullscreen" src="https://www.tiktok.com/player/v1/${tiktok}?music_info=1&description=1&autoplay=0"></iframe></div><div class="visualCaption">${esc(title)}<div class="visualMeta">TikTok</div></div></article>`;
  const youtube=visual.platform==='youtube'?youtubeId(url):'';
  if(youtube)return `<article class="visualCard visualYouTube"><div class="visualMedia vcr-clean"><iframe class="ytFrame" loading="lazy" title="${esc(title)}" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share" allowfullscreen src="https://www.youtube.com/embed/${esc(youtube)}"></iframe></div><div class="visualCaption">${esc(title)}<div class="visualMeta">YouTube</div></div></article>`;
  const preview=safeUrl(visual.preview_url);
  return `<article class="visualCard visualOther"><a class="visualFallback" target="_blank" rel="noopener" href="${esc(url)}">${preview?`<img class="vcr-clean" src="${esc(preview)}" alt="" loading="lazy">`:''}<div class="visualCaption">${esc(title)} →<div class="visualMeta">${esc(visual.platform||'visual')}</div></div></a></article>`;
}

function renderPanel(kind){
  $('panelTitle').textContent=kind;
  const content=$('panelText');
  if(kind==='релизы')content.innerHTML=state.releases.length?`<div class="releaseListRich">${state.releases.map(releaseCard).join('')}</div>`:'<div class="emptyState">релизов пока нет</div>';
  else if(kind==='визуалы')content.innerHTML=state.visuals.length?`<div class="visualGridRich">${state.visuals.map(visualCard).join('')}</div>`:'<div class="emptyState">визуалов пока нет</div>';
  else content.innerHTML='<div class="emptyState">игра появится здесь позже</div>';
  hydrateRenderedMedia(content);
  if(kind==='релизы'&&state.active){
    const replacement=qa('.trackPlay',content).find(button=>String(button.dataset.releaseId)===String(state.active.release?.id)&&Number(button.dataset.trackIndex)===Number(state.active.trackIndex));
    if(replacement){state.active.button=replacement;setActiveCard(replacement);updatePlaying(dock().classList.contains('playing'))}
  }
}

function openPanel(kind,trigger){
  markVcrTransition();
  renderPanel(kind);
  const panel=$('panel');
  panel.dataset.triggerId=trigger?.dataset.panel||'';
  panel.classList.add('on');
  panel.setAttribute('aria-hidden','false');
  $('close').focus({preventScroll:true});
  window.inkiviVcrRefresh?.();
  if(kind==='релизы')hydrateMissingReleases();
}

function closePanel(){
  markVcrTransition();
  const panel=$('panel');
  panel.classList.remove('on');
  panel.setAttribute('aria-hidden','true');
  qa('[data-panel]').find(button=>button.dataset.panel===panel.dataset.triggerId)?.focus({preventScroll:true});
  window.inkiviVcrRefresh?.();
}

function appleId(url){
  const value=String(url||'');
  return value.match(/[?&](?:i|id)=(\d+)/i)?.[1]||[...value.matchAll(/\/(\d{6,})(?:[/?#]|$)/g)].pop()?.[1]||'';
}

async function appleLookup(id,country){
  const response=await fetch('https://itunes.apple.com/lookup?'+new URLSearchParams({id:String(id),entity:'song',country}));
  if(!response.ok)return null;
  const rows=(await response.json()).results||[];
  return {collection:rows.find(item=>item.wrapperType==='collection'),tracks:rows.filter(item=>item.wrapperType==='track')};
}

async function enrichRelease(release){
  if(release._enriched||trackList(release).some(track=>safeUrl(track.preview||track.previewUrl))){release._enriched=true;return false}
  release._enriched=true;
  try{
    let result=null;
    const id=appleId(release.platforms?.apple);
    if(id){for(const country of ['RU','US','GB']){result=await appleLookup(id,country);if(result?.tracks?.length)break}}
    if(!result?.tracks?.length){
      for(const country of ['RU','US','GB']){
        const response=await fetch('https://itunes.apple.com/search?'+new URLSearchParams({term:`inkivi ${norm(release.title)}`,entity:'song',limit:'30',country}));
        if(!response.ok)continue;
        const rows=(await response.json()).results||[];
        const hit=rows.find(item=>norm(item.artistName)==='inkivi'&&(norm(item.trackName)===norm(release.title)||norm(item.collectionName)===norm(release.title)))||rows.find(item=>norm(item.artistName)==='inkivi');
        if(hit?.collectionId)result=await appleLookup(hit.collectionId,country);
        else if(hit)result={collection:null,tracks:[hit]};
        if(result?.tracks?.length)break;
      }
    }
    if(!result?.tracks?.length)return false;
    release.tracklist=result.tracks.map((track,index)=>({title:track.trackName||`трек ${index+1}`,preview:track.previewUrl||'',duration:track.trackTimeMillis||0,number:track.trackNumber||index+1}));
    release.platforms=release.platforms||{};
    const artwork=(result.collection?.artworkUrl100||result.tracks[0]?.artworkUrl100||'').replace('100x100bb','600x600bb');
    if(artwork&&!release.cover_url)release.cover_url=artwork;
    if(result.collection?.collectionViewUrl&&!release.platforms.apple)release.platforms.apple=result.collection.collectionViewUrl;
    return true;
  }catch{return false}
}

async function hydrateMissingReleases(){
  const changed=(await Promise.all(state.releases.map(enrichRelease))).some(Boolean);
  if(changed&&$('panel').classList.contains('on')&&$('panelTitle').textContent==='релизы')renderPanel('релизы');
}

function releaseById(id){return state.releases.find(release=>String(release.id)===String(id))||state.current}

const dock=()=>$('globalAudioDock');
const audio=()=>q('audio',dock());
const dockLabel=()=>q('.dockLabel',dock());
const dockFill=()=>q('.dockProgress i',dock());
const dockTime=()=>q('.dockTime',dock());

function updatePlaying(on){
  dock().classList.toggle('playing',!!on);
  q('.dockPlay',dock()).innerHTML=on?PAUSE:PLAY;
  q('.dockPlay',dock()).setAttribute('aria-label',on?'Пауза':'Воспроизвести');
  qa('.releaseCard.is-playing').forEach(card=>card.classList.remove('is-playing'));
  qa('.trackPlay.active,.heroPlayStrip.active').forEach(button=>{button.innerHTML=button.classList.contains('heroPlayStrip')?PLAY+`<span>${esc(state.active?.track?.title||state.active?.release?.title||'трек')}</span>`:PLAY;button.classList.remove('active')});
  if(state.active?.button){
    state.active.button.classList.add('active');
    state.active.button.innerHTML=state.active.button.classList.contains('heroPlayStrip')?(on?PAUSE:PLAY)+`<span>${esc(state.active.track?.title||state.active.release?.title||'трек')}</span>`:(on?PAUSE:PLAY);
    if(on)state.active.button.closest('.releaseCard')?.classList.add('is-playing');
  }
}

function setActiveCard(button){
  qa('.releaseCard.is-active').forEach(card=>card.classList.remove('is-active'));
  button?.closest('.releaseCard')?.classList.add('is-active');
}

function setRowStatus(button,text){
  const element=button?.closest('.trackLite')?.querySelector(':scope > span:last-child');
  if(element)element.textContent=text;
}

function showDock(release,track,trackIndex,button,status){
  state.active={release,track,trackIndex,button,mode:'loading',wantPlay:true,key:`${release?.id||''}:${trackIndex}`};
  dock().hidden=false;
  document.body.classList.add('audioDockOpen');
  q('.dockTitle',dock()).textContent=track?.title||release?.title||'трек';
  dockLabel().textContent=status;
  dockFill().style.width='0%';
  dockTime().textContent='0:00 / 0:00';
  const cover=q('.dockCover',dock());
  loadImage(cover,release?.cover_url||release?.platforms?.artwork,'');
  setActiveCard(button);
  updatePlaying(false);
}

function stopSources(reset=true){
  const element=audio();
  try{element.pause()}catch{}
  if(reset){element.removeAttribute('src');try{element.load()}catch{}}
  try{state.scWidget?.pause()}catch{}
}

async function playNative(source,seq){
  const element=audio();
  state.active.mode='native';
  state.active.nativeKind=source.kind;
  dockLabel().textContent=source.kind==='full'?'audio · full':'audio · preview';
  setRowStatus(state.active.button,source.label);
  element.src=source.url;
  element.volume=Number(q('.dockVolume input',dock()).value)/100;
  try{
    await withTimeout(element.play(),8000,'audio timeout');
    if(seq!==state.playSeq){element.pause();return false}
    updatePlaying(true);
    return true;
  }catch{
    if(seq===state.playSeq){element.removeAttribute('src');try{element.load()}catch{}}
    return false;
  }
}

function loadScript(src){
  if(state.scScript)return state.scScript;
  state.scScript=new Promise((resolve,reject)=>{
    if(window.SC?.Widget){state.scRetryAfter=0;return resolve()}
    const script=document.createElement('script');
    script.src=src;script.async=true;
    script.onload=()=>{state.scRetryAfter=0;resolve()};
    script.onerror=()=>{state.scScript=null;reject(new Error('soundcloud api unavailable'))};
    document.head.appendChild(script);
  });
  return state.scScript;
}

function soundScore(title,sound){
  const left=norm(title),right=norm(sound?.title||sound?.permalink||'');
  if(!left||!right)return 0;
  if(left===right)return 100;
  if(left.includes(right)||right.includes(left))return 80;
  const a=new Set(left.split(' ')),b=new Set(right.split(' '));
  let matches=0;a.forEach(token=>{if(b.has(token))matches++});
  return 60*matches/Math.max(a.size,b.size);
}

function soundMatch(sounds,title,fallbackIndex=0){
  let best=null,bestScore=0;
  sounds.forEach((sound,index)=>{const score=soundScore(title,sound);if(score>bestScore){best={sound,index};bestScore=score}});
  if(best&&bestScore>=45)return best;
  const index=Math.max(0,Math.min(sounds.length-1,Number(fallbackIndex)||0));
  return sounds[index]?{sound:sounds[index],index}:null;
}

function soundCloudOptions(url,startIndex=0){
  return {url,auto_play:false,start_track:Number(startIndex)||0,hide_related:true,show_comments:false,show_user:false,show_reposts:false,visual:false,buying:false,sharing:false,download:false};
}

function unbindSoundCloud(widget){
  const events=window.SC?.Widget?.Events;
  if(!events)return;
  [events.READY,events.ERROR,events.PLAY,events.PAUSE,events.FINISH,events.PLAY_PROGRESS].forEach(event=>{try{widget.unbind(event)}catch{}});
}

async function loadSoundCloudWidget(url,startIndex,seq){
  await withTimeout(loadScript('https://w.soundcloud.com/player/api.js'),4500,'soundcloud api timeout');
  if(seq!==state.playSeq)return false;
  const frame=q('.scEngine',dock());
  const events=window.SC.Widget.Events;
  if(!state.scWidget){
    frame.src='https://w.soundcloud.com/player/?'+new URLSearchParams(soundCloudOptions(url,startIndex));
    const widget=window.SC.Widget(frame);
    state.scWidget=widget;
    await withTimeout(new Promise((resolve,reject)=>{
      widget.bind(events.READY,resolve);
      widget.bind(events.ERROR,()=>reject(new Error('soundcloud widget error')));
    }),7500,'soundcloud ready timeout');
  }else{
    const widget=state.scWidget;
    unbindSoundCloud(widget);
    const {url:ignored,...options}=soundCloudOptions(url,startIndex);
    await withTimeout(new Promise((resolve,reject)=>{
      widget.bind(events.ERROR,()=>reject(new Error('soundcloud widget error')));
      widget.load(url,{...options,callback:resolve});
    }),7500,'soundcloud load timeout');
  }
  return seq===state.playSeq;
}

function getSoundCloudSounds(widget){
  return withTimeout(new Promise(resolve=>{
    try{widget.getSounds(sounds=>resolve(Array.isArray(sounds)?sounds:[]))}catch{resolve([])}
  }),2600,'soundcloud catalog timeout').catch(()=>[]);
}

async function resolveSoundCloudTrack(source,title,index,seq){
  let sounds=state.scCatalog.get(source.url);
  let sourceLoaded=false;
  if(!sounds){
    if(!await loadSoundCloudWidget(source.url,index,seq))return null;
    sourceLoaded=true;
    sounds=await getSoundCloudSounds(state.scWidget);
    if(sounds.length)state.scCatalog.set(source.url,sounds);
  }
  if(seq!==state.playSeq)return null;
  const match=soundMatch(sounds||[],title,index);
  const direct=safeUrl(match?.sound?.permalink_url);
  if(direct&&direct!==source.url)return {url:direct,startIndex:0,loaded:false};
  return {url:source.url,startIndex:match?.index??index,loaded:sourceLoaded};
}

async function playSoundCloud(source,index,seq){
  dockLabel().textContent='soundcloud · загрузка';
  setRowStatus(state.active.button,'загрузка');
  if(Date.now()<state.scRetryAfter)return false;
  try{
    const resolved=await resolveSoundCloudTrack(source,state.active?.track?.title||state.active?.release?.title,index,seq);
    if(!resolved||seq!==state.playSeq)return false;
    if(!resolved.loaded&&!await loadSoundCloudWidget(resolved.url,resolved.startIndex,seq))return false;
    const widget=state.scWidget;
    const events=window.SC.Widget.Events;
    unbindSoundCloud(widget);
    state.active.mode='soundcloud-pending';
    state.scDuration=0;
    widget.setVolume(Number(q('.dockVolume input',dock()).value));
    const started=await withTimeout(new Promise((resolve,reject)=>{
      widget.bind(events.ERROR,()=>reject(new Error('soundcloud playback error')));
      widget.bind(events.PLAY,()=>{
        if(!String(state.active?.mode||'').startsWith('soundcloud'))return;
        state.active.mode='soundcloud';
        dockLabel().textContent='soundcloud · full';
        setRowStatus(state.active.button,'full');
        updatePlaying(true);
        widget.getDuration(value=>{state.scDuration=Number(value)||0});
        resolve(true);
      });
      widget.bind(events.PLAY_PROGRESS,event=>{
        if(state.active?.mode!=='soundcloud')return;
        const duration=state.scDuration||Number(event.duration)||0;
        const position=Number(event.currentPosition)||0;
        state.scDuration=duration;
        dockFill().style.width=(duration?Math.min(1,position/duration):0)*100+'%';
        dockTime().textContent=fmt(position/1000)+' / '+fmt(duration/1000);
      });
      widget.play();
    }),6500,'soundcloud play timeout');
    widget.bind(events.PAUSE,()=>{if(state.active?.mode==='soundcloud')updatePlaying(false)});
    widget.bind(events.FINISH,()=>{if(state.active?.mode==='soundcloud')updatePlaying(false)});
    state.scRetryAfter=0;
    return !!started;
  }catch{
    state.scRetryAfter=Date.now()+45000;
    try{state.scWidget?.pause()}catch{}
    return false;
  }
}

async function chooseTrack(button){
  const release=releaseById(button.dataset.releaseId);
  const index=Math.max(0,Number(button.dataset.trackIndex)||0);
  const track=trackList(release)[index]||trackList(release)[0];
  if(!release||!track)return;
  const key=`${release.id||''}:${index}`;
  if(state.active?.key===key&&['native','soundcloud'].includes(state.active.mode)){state.active.button=button;togglePlayback();return}
  const seq=++state.playSeq;
  stopSources(true);
  const sources=audioSources(track,release);
  showDock(release,track,index,button,sources.length?'audio · загрузка':'audio недоступно');
  state.active.key=key;
  for(const source of sources){
    if(seq!==state.playSeq)return;
    const ok=source.kind==='soundcloud'?await playSoundCloud(source,index,seq):await playNative(source,seq);
    if(ok)return;
  }
  if(seq===state.playSeq){state.active.mode='unavailable';dockLabel().textContent='audio недоступно';setRowStatus(button,'нет audio');updatePlaying(false)}
}

function togglePlayback(){
  if(!state.active)return;
  if(state.active.mode==='native'){
    const element=audio();
    if(element.paused){state.active.wantPlay=true;element.play().then(()=>updatePlaying(true)).catch(()=>{})}
    else{state.active.wantPlay=false;element.pause();updatePlaying(false)}
  }else if(state.active.mode==='soundcloud'&&state.scWidget){
    if(dock().classList.contains('playing')){state.active.wantPlay=false;state.scWidget.pause();updatePlaying(false)}
    else{state.active.wantPlay=true;state.scWidget.play()}
  }
}

function closeDock(){
  state.playSeq++;
  stopSources(true);
  updatePlaying(false);
  state.active=null;
  qa('.releaseCard.is-active').forEach(card=>card.classList.remove('is-active'));
  dock().hidden=true;
  document.body.classList.remove('audioDockOpen');
  window.inkiviVcrRefresh?.();
}

function bindPlayer(){
  const element=audio();
  const volume=q('.dockVolume input',dock());
  const saved=Math.max(0,Math.min(100,Number(localStorage.getItem('inkiviVolume')??82)));
  volume.value=String(saved);element.volume=saved/100;
  q('.dockPlay',dock()).innerHTML=PLAY;
  element.addEventListener('timeupdate',()=>{
    if(state.active?.mode!=='native')return;
    const duration=element.duration||0;
    dockFill().style.width=(duration?Math.min(1,element.currentTime/duration):0)*100+'%';
    dockTime().textContent=fmt(element.currentTime)+' / '+fmt(duration);
  });
  element.addEventListener('ended',()=>updatePlaying(false));
  element.addEventListener('pause',()=>{if(state.active?.mode==='native'&&!state.active.wantPlay)updatePlaying(false)});
  q('.dockPlay',dock()).addEventListener('click',togglePlayback);
  q('.dockClose',dock()).addEventListener('click',closeDock);
  q('.dockProgress',dock()).addEventListener('pointerdown',event=>{
    const rect=event.currentTarget.getBoundingClientRect();
    const position=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
    if(state.active?.mode==='native'&&Number.isFinite(element.duration))element.currentTime=position*element.duration;
    else if(state.active?.mode==='soundcloud'&&state.scWidget)state.scWidget.seekTo(position*(state.scDuration||0));
  });
  volume.addEventListener('input',()=>{
    const value=Math.max(0,Math.min(100,Number(volume.value)));
    localStorage.setItem('inkiviVolume',String(value));element.volume=value/100;
    try{state.scWidget?.setVolume(value)}catch{}
  });
}

document.addEventListener('click',event=>{
  const trackButton=event.target.closest('.trackPlay,.heroPlayStrip');
  if(trackButton&&!trackButton.disabled){event.preventDefault();chooseTrack(trackButton);return}
  const toggle=event.target.closest('.trackToggle');
  if(toggle){const drawer=toggle.parentElement.querySelector('.trackDrawer');const open=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!open));drawer.hidden=open;toggle.querySelector('span').textContent=drawer.querySelectorAll('.trackLite').length+(open?' ↓':' ↑');window.inkiviVcrRefresh?.()}
});

qa('[data-panel]').forEach(button=>button.addEventListener('click',()=>openPanel(button.dataset.panel,button)));
$('close').addEventListener('click',closePanel);
$('enter').addEventListener('click',()=>swap($('start'),$('menu')));
$('back').addEventListener('click',()=>swap($('menu'),$('start')));
$('presave').addEventListener('click',event=>{if($('presave').getAttribute('aria-disabled')==='true')event.preventDefault()});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('panel').classList.contains('on'))closePanel()});

if(matchMedia('(hover:hover) and (pointer:fine)').matches){
  qa('.zone').forEach(zone=>{
    zone.addEventListener('pointermove',event=>{const rect=zone.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width-.5,y=(event.clientY-rect.top)/rect.height-.5;zone.style.transform=`perspective(1000px) rotateX(${-y*4}deg) rotateY(${x*5}deg)`});
    zone.addEventListener('pointerleave',()=>zone.style.transform='');
  });
  const heroCover=$('heroReleaseCover');
  heroCover.addEventListener('pointermove',event=>{
    const rect=heroCover.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width-.5,y=(event.clientY-rect.top)/rect.height-.5;
    heroCover.style.transform=`perspective(900px) rotateX(${-y*7}deg) rotateY(${x*8}deg) scale(1.018)`;
  });
  heroCover.addEventListener('pointerleave',()=>heroCover.style.transform='');
}

bindPlayer();
initGlyphJitter();
renderTimer();
setInterval(renderTimer,1000);
boot().then(()=>{
  if(state.releases.some(release=>safeUrl(release.platforms?.soundcloud))){
    setTimeout(()=>withTimeout(loadScript('https://w.soundcloud.com/player/api.js'),4200,'soundcloud preload timeout').catch(()=>{state.scRetryAfter=Date.now()+45000}),0);
  }
});
})();
