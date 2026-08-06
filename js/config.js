export const siteConfig = {
  artist: 'inkivi',
  canonicalUrl: 'https://inkivi.github.io/inkivi/',
  timeZone: 'Europe/Moscow',

  upcomingRelease: {
    enabled: true,
    title: 'комната без окон',
    date: '2026-09-18T00:00:00+03:00',
    presaveUrl: '#',
    cover: './assets/releases/upcoming.svg'
  },

  latestRelease: {
    title: 'не здесь',
    date: '2026-04-24',
    cover: './assets/releases/latest.svg',
    bandlink: '#'
  },

  socials: {
    tiktok: '#',
    youtube: '#',
    telegram: '#',
    vk: '#'
  },

  visuals: [
    { title: 'свет в коридоре', thumbnail: './assets/visuals/visual-01.svg', url: '#', date: '2026-07-18' },
    { title: 'пыль на экране', thumbnail: './assets/visuals/visual-02.svg', url: '#', date: '2026-06-29' },
    { title: 'третий этаж', thumbnail: './assets/visuals/visual-03.svg', url: '#', date: '2026-05-12' },
    { title: 'тишина после', thumbnail: './assets/visuals/visual-04.svg', url: '#', date: '2026-03-08' }
  ],

  releases: [
    {
      title: 'не здесь', date: '2026-04-24', type: 'сингл', cover: './assets/releases/latest.svg', bandlink: '#',
      links: { spotify: '#', appleMusic: '#', yandexMusic: '#', vkMusic: '#', youtubeMusic: '#' }
    },
    {
      title: 'тёмная вода', date: '2025-11-07', type: 'EP', cover: './assets/releases/release-02.svg', bandlink: '#',
      links: { spotify: '#', appleMusic: '#', yandexMusic: '#', vkMusic: '#', youtubeMusic: '#' }
    },
    {
      title: 'пока не погасло', date: '2025-05-16', type: 'сингл', cover: './assets/releases/release-03.svg', bandlink: '#',
      links: { spotify: '#', appleMusic: '#', yandexMusic: '#', vkMusic: '#', youtubeMusic: '#' }
    }
  ],

  game: {
    enabled: true,
    title: 'inkivi.exe',
    description: 'Соберите обрывки сигнала, пока комната не погасла. Управление: стрелки, WASD или экранные кнопки.',
    url: './game/index.html',
    preview: './assets/game/preview.svg'
  }
};
