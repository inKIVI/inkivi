const platformNames = {
  spotify: 'Spotify',
  appleMusic: 'Apple Music',
  yandexMusic: 'Яндекс Музыка',
  vkMusic: 'VK Музыка',
  youtubeMusic: 'YouTube Music'
};
const formatDate = (date, timeZone) => new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric', timeZone }).format(new Date(date));

export function renderReleases(container, releases, timeZone) {
  if (!container) return;
  if (!releases.length) {
    container.innerHTML = '<p>Релизы скоро появятся.</p>';
    return;
  }

  let index = 0;
  container.innerHTML = `
    <article class="release-feature">
      <div class="release-case" aria-hidden="true">
        <img class="release-case__cover" data-release-cover src="" alt="">
        <span class="release-case__disc"></span>
      </div>
      <div class="release-meta">
        <div class="release-meta__line"><span data-release-type></span><time data-release-date></time></div>
        <h3 data-release-title></h3>
        <div class="platform-links" data-platform-links></div>
        <a class="button button--primary" data-bandlink href="#" target="_blank" rel="noopener noreferrer">открыть BandLink</a>
      </div>
    </article>
    <nav class="release-list" data-release-list aria-label="Список релизов"></nav>`;

  const cover = container.querySelector('[data-release-cover]');
  const title = container.querySelector('[data-release-title]');
  const type = container.querySelector('[data-release-type]');
  const date = container.querySelector('[data-release-date]');
  const platforms = container.querySelector('[data-platform-links]');
  const bandlink = container.querySelector('[data-bandlink]');
  const list = container.querySelector('[data-release-list]');

  releases.forEach((release, releaseIndex) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = `<img src="${release.cover}" alt="" loading="lazy"><span><strong>${release.title}</strong><small>${release.type}</small></span>`;
    button.addEventListener('click', () => select(releaseIndex));
    list.append(button);
  });

  function select(nextIndex) {
    index = nextIndex;
    const release = releases[index];
    cover.src = release.cover;
    cover.alt = `Обложка релиза «${release.title}»`;
    title.textContent = release.title;
    type.textContent = release.type;
    date.dateTime = release.date;
    date.textContent = formatDate(release.date, timeZone);
    bandlink.href = release.bandlink;
    bandlink.setAttribute('aria-disabled', release.bandlink === '#' ? 'true' : 'false');
    platforms.replaceChildren();

    Object.entries(release.links || {}).forEach(([platform, url]) => {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = platformNames[platform] || platform;
      if (url === '#') anchor.setAttribute('aria-disabled', 'true');
      platforms.append(anchor);
    });

    [...list.children].forEach((button, buttonIndex) => button.setAttribute('aria-current', String(buttonIndex === index)));
  }

  select(0);
}
