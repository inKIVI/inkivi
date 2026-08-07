(()=>{
  const PROFILE_URL='https://www.tiktok.com/@inkivi2';
  const USERNAME='inkivi2';

  function loadEmbedScript(){
    const old=document.getElementById('tiktokCreatorEmbedScript');
    if(old) old.remove();
    const s=document.createElement('script');
    s.id='tiktokCreatorEmbedScript';
    s.src='https://www.tiktok.com/embed.js';
    s.async=true;
    document.body.appendChild(s);
  }

  function renderCreatorProfile(){
    const panel=document.getElementById('panel');
    const title=document.getElementById('panelTitle');
    const content=document.getElementById('panelText');
    if(!panel?.classList.contains('on')||!content||title?.textContent!=='визуалы') return;

    let host=document.getElementById('tiktokCreatorProfile');
    if(!host){
      host=document.createElement('div');
      host.id='tiktokCreatorProfile';
      host.style.cssText='width:min(760px,100%);margin:0 auto 22px;position:relative;z-index:2;';
      content.prepend(host);
    }

    host.innerHTML=`<blockquote class="tiktok-embed" cite="${PROFILE_URL}" data-unique-id="${USERNAME}" data-embed-type="creator" style="max-width:720px;min-width:288px;margin:0 auto"><section><a target="_blank" rel="noopener" href="${PROFILE_URL}?refer=creator_embed">@${USERNAME}</a></section></blockquote>`;
    loadEmbedScript();
  }

  function install(){
    const btn=document.querySelector('[data-panel="визуалы"]');
    if(btn) btn.addEventListener('click',()=>setTimeout(renderCreatorProfile,0));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install);
  else install();
})();
