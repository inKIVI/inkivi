const formatDate = (date, timeZone) => new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric', timeZone }).format(new Date(date));

export function renderVisuals(container, visuals, timeZone) {
  if (!container) return;
  if (!visuals.length) {
    container.innerHTML = '<p>Визуалы скоро появятся.</p>';
    return;
  }

  let index = 0;
  container.innerHTML = `
    <div class="visual-stage">
      <button class="visual-nav" type="button" data-visual-prev aria-label="Предыдущий визуал">←</button>
      <div class="visual-stage__media" data-visual-media>
        <img data-visual-image src="" alt="">
        <span class="visual-stage__index" data-visual-index></span>
      </div>
      <button class="visual-nav" type="button" data-visual-next aria-label="Следующий визуал">→</button>
    </div>
    <div class="visual-info">
      <div><time data-visual-date></time><h3 data-visual-title></h3></div>
      <div class="visual-thumbs" data-visual-thumbs aria-label="Список визуалов"></div>
      <a class="button button--primary" data-visual-link href="#" target="_blank" rel="noopener noreferrer">открыть в TikTok</a>
    </div>`;

  const image = container.querySelector('[data-visual-image]');
  const media = container.querySelector('[data-visual-media]');
  const title = container.querySelector('[data-visual-title]');
  const date = container.querySelector('[data-visual-date]');
  const link = container.querySelector('[data-visual-link]');
  const counter = container.querySelector('[data-visual-index]');
  const thumbs = container.querySelector('[data-visual-thumbs]');

  visuals.forEach((visual, visualIndex) => {
    const button = document.createElement('button');
    button.className = 'visual-thumb';
    button.type = 'button';
    button.setAttribute('aria-label', `Показать визуал «${visual.title}»`);
    button.innerHTML = `<img src="${visual.thumbnail}" alt="" loading="lazy">`;
    button.addEventListener('click', () => select(visualIndex));
    thumbs.append(button);
  });

  function select(nextIndex) {
    index = (nextIndex + visuals.length) % visuals.length;
    const visual = visuals[index];
    media.classList.add('is-changing');
    window.setTimeout(() => {
      image.src = visual.thumbnail;
      image.alt = `Превью визуала «${visual.title}»`;
      title.textContent = visual.title;
      date.dateTime = visual.date;
      date.textContent = formatDate(visual.date, timeZone);
      link.href = visual.url;
      link.setAttribute('aria-disabled', visual.url === '#' ? 'true' : 'false');
      counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(visuals.length).padStart(2, '0')}`;
      [...thumbs.children].forEach((thumb, thumbIndex) => thumb.setAttribute('aria-current', String(thumbIndex === index)));
      media.classList.remove('is-changing');
    }, 160);
  }

  container.querySelector('[data-visual-prev]').addEventListener('click', () => select(index - 1));
  container.querySelector('[data-visual-next]').addEventListener('click', () => select(index + 1));

  let startX = 0;
  media.addEventListener('pointerdown', (event) => { startX = event.clientX; media.setPointerCapture?.(event.pointerId); });
  media.addEventListener('pointerup', (event) => {
    const delta = event.clientX - startX;
    if (Math.abs(delta) > 45) select(index + (delta < 0 ? 1 : -1));
  });

  select(0);
}
