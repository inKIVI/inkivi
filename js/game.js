export function renderGame(container, game) {
  if (!container) return;
  container.innerHTML = `
    <div class="game-preview" data-game-preview>
      <img src="${game.preview}" alt="Превью игры ${game.title}">
    </div>
    <div class="game-copy">
      <p class="eyebrow">браузерный модуль</p>
      <h3>${game.title}</h3>
      <p>${game.description}</p>
      <button class="button button--primary" type="button" data-game-launch>${game.enabled ? 'запустить игру' : 'игра скоро появится'}</button>
    </div>`;

  const button = container.querySelector('[data-game-launch]');
  const preview = container.querySelector('[data-game-preview]');
  button.disabled = !game.enabled;

  button.addEventListener('click', () => {
    if (!game.enabled || preview.classList.contains('is-running')) return;
    const iframe = document.createElement('iframe');
    iframe.className = 'game-frame';
    iframe.title = game.title;
    iframe.src = game.url;
    iframe.allow = 'fullscreen';
    iframe.loading = 'eager';
    preview.replaceChildren(iframe);
    preview.classList.add('is-running');
    button.textContent = 'игра запущена';
    button.disabled = true;
    iframe.focus();
  });
}
