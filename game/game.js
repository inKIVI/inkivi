(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const statusEl = document.getElementById('status');
  const keys = new Set();
  const player = { x: 100, y: 300, r: 14, speed: 235 };
  const motes = [
    {x:220,y:150},{x:360,y:430},{x:485,y:220},{x:620,y:475},{x:740,y:150},{x:830,y:340},{x:540,y:340}
  ].map((m, i) => ({...m, r: 9 + (i % 3), alive: true, phase: i * .8}));
  let score = 0;
  let last = performance.now();
  let won = false;

  function resizeForDpr() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(320, Math.round(rect.width * dpr));
    const h = Math.max(200, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }
  function toWorldX(x) { return x * canvas.width / 960; }
  function toWorldY(y) { return y * canvas.height / 600; }

  function update(dt) {
    if (won) return;
    let dx = 0, dy = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) dx -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) dx += 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) dy -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) dy += 1;
    if (dx && dy) { dx *= .707; dy *= .707; }
    player.x = Math.max(28, Math.min(932, player.x + dx * player.speed * dt));
    player.y = Math.max(28, Math.min(572, player.y + dy * player.speed * dt));

    motes.forEach((mote) => {
      if (!mote.alive) return;
      const dist = Math.hypot(player.x - mote.x, player.y - mote.y);
      if (dist < player.r + mote.r + 6) {
        mote.alive = false;
        score += 1;
        scoreEl.textContent = score;
        statusEl.textContent = score < motes.length ? 'сигнал становится ближе' : 'комната услышала вас';
        if (score === motes.length) won = true;
      }
    });
  }

  function draw(time) {
    resizeForDpr();
    const sx = canvas.width / 960, sy = canvas.height / 600;
    ctx.setTransform(sx, 0, 0, sy, 0, 0);
    const g = ctx.createRadialGradient(player.x, player.y, 10, player.x, player.y, 260);
    g.addColorStop(0, 'rgba(140,148,103,.18)');
    g.addColorStop(1, 'rgba(11,13,10,0)');
    ctx.fillStyle = '#10120e'; ctx.fillRect(0,0,960,600);
    ctx.fillStyle = g; ctx.fillRect(0,0,960,600);

    ctx.strokeStyle = 'rgba(119,122,94,.12)'; ctx.lineWidth = 2;
    for (let x=80;x<960;x+=120) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,600); ctx.stroke(); }
    for (let y=70;y<600;y+=100) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(960,y); ctx.stroke(); }

    motes.forEach((mote) => {
      if (!mote.alive) return;
      const pulse = 1 + Math.sin(time/500 + mote.phase) * .22;
      ctx.beginPath(); ctx.arc(mote.x,mote.y,mote.r*3.2*pulse,0,Math.PI*2); ctx.fillStyle='rgba(185,180,117,.08)'; ctx.fill();
      ctx.beginPath(); ctx.arc(mote.x,mote.y,mote.r*pulse,0,Math.PI*2); ctx.fillStyle='#b9b475'; ctx.fill();
    });

    ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI*2); ctx.fillStyle='#e4dfcf'; ctx.fill();
    ctx.beginPath(); ctx.arc(player.x+4, player.y-4, 3, 0, Math.PI*2); ctx.fillStyle='#6c2f2b'; ctx.fill();

    if (won) {
      ctx.fillStyle='rgba(9,10,8,.62)'; ctx.fillRect(0,0,960,600);
      ctx.fillStyle='#e4dfcf'; ctx.font='700 52px Arial'; ctx.textAlign='center'; ctx.fillText('сигнал найден',480,285);
      ctx.fillStyle='#c4b991'; ctx.font='20px monospace'; ctx.fillText('inkivi.exe / connection restored',480,330);
    }
  }

  function frame(now) {
    const dt = Math.min(.04, (now-last)/1000); last = now;
    update(dt); draw(now); requestAnimationFrame(frame);
  }
  window.addEventListener('keydown', (e) => { if (/^(Arrow|Key[WASD])/.test(e.code)) { e.preventDefault(); keys.add(e.code); } });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  document.querySelectorAll('[data-key]').forEach((button) => {
    const key = button.dataset.key;
    const down = (e) => { e.preventDefault(); keys.add(key); button.setPointerCapture?.(e.pointerId); };
    const up = (e) => { e.preventDefault(); keys.delete(key); };
    button.addEventListener('pointerdown', down); button.addEventListener('pointerup', up); button.addEventListener('pointercancel', up); button.addEventListener('pointerleave', up);
  });
  requestAnimationFrame(frame);
})();
