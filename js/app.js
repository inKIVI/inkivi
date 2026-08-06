import { siteConfig } from './config.js';
import { createReleaseTimer } from './release-timer.js';
import { createWorldTransitions } from './transitions.js';
import { createPanelManager } from './panels.js';
import { renderVisuals } from './visuals.js';
import { renderReleases } from './releases.js';
import { renderGame } from './game.js';

const releaseScreen = document.getElementById('release-screen');
const world = document.getElementById('main-world');
const overlay = document.getElementById('door-transition');
const panelManager = createPanelManager();
const transitions = createWorldTransitions({ releaseScreen, world, overlay });
let stopTimer = null;

const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric', timeZone: siteConfig.timeZone });

function usableUrl(url) { return typeof url === 'string' && url.trim() && url !== '#'; }
function applyLinkState(anchor, url) {
  anchor.href = url || '#';
  anchor.setAttribute('aria-disabled', String(!usableUrl(url)));
}

function showLatestRelease() {
  stopTimer?.();
  const latest = siteConfig.latestRelease;
  document.getElementById('release-kicker').textContent = 'последний релиз';
  document.getElementById('release-title').textContent = latest.title;
  const date = document.getElementById('release-date');
  date.dateTime = latest.date;
  date.textContent = dateFormatter.format(new Date(latest.date));
  document.getElementById('countdown').hidden = true;
  const art = document.getElementById('release-art');
  art.hidden = false;
  const cover = document.getElementById('release-cover');
  cover.src = latest.cover;
  cover.alt = `Обложка релиза «${latest.title}»`;
  const primary = document.getElementById('release-primary-link');
  primary.textContent = 'слушать последний релиз';
  applyLinkState(primary, latest.bandlink);
}

function showUpcomingRelease() {
  const upcoming = siteConfig.upcomingRelease;
  const target = new Date(upcoming.date);
  if (!upcoming.enabled || !Number.isFinite(target.getTime()) || target.getTime() <= Date.now()) {
    showLatestRelease();
    return;
  }

  document.getElementById('release-kicker').textContent = 'ближайший релиз';
  document.getElementById('release-title').textContent = upcoming.title;
  const date = document.getElementById('release-date');
  date.dateTime = upcoming.date;
  date.textContent = dateFormatter.format(target);
  document.getElementById('countdown').hidden = false;
  document.getElementById('release-art').hidden = true;
  const primary = document.getElementById('release-primary-link');
  primary.textContent = 'сделать пресейв';
  applyLinkState(primary, upcoming.presaveUrl);
  stopTimer = createReleaseTimer(upcoming.date, {
    days: document.getElementById('countdown-days'),
    hours: document.getElementById('countdown-hours'),
    minutes: document.getElementById('countdown-minutes'),
    seconds: document.getElementById('countdown-seconds')
  }, showLatestRelease);
}

function renderSocials() {
  const socialNames = { tiktok: 'TikTok', youtube: 'YouTube', telegram: 'Telegram', vk: 'VK' };
  const nav = document.getElementById('release-socials');
  Object.entries(siteConfig.socials).forEach(([name, url]) => {
    const link = document.createElement('a');
    link.textContent = socialNames[name] || name;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    applyLinkState(link, url);
    nav.append(link);
  });
}

function bindNavigation() {
  document.getElementById('enter-button').addEventListener('click', transitions.enter);
  document.querySelectorAll('[data-action="back"]').forEach((button) => button.addEventListener('click', transitions.leave));
  document.querySelectorAll('[data-panel]').forEach((button) => button.addEventListener('click', () => panelManager.open(button.dataset.panel, button)));
}

function bindDesktopAtmosphere() {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!finePointer.matches || reducedMotion.matches) return;

  const scene = document.getElementById('desktop-scene');
  const start = document.getElementById('release-screen');
  const eyes = document.querySelectorAll('.cat-eye');

  start.addEventListener('pointermove', (event) => {
    start.style.setProperty('--light-x', `${(event.clientX / window.innerWidth) * 100}%`);
    start.style.setProperty('--light-y', `${(event.clientY / window.innerHeight) * 100}%`);
  }, { passive: true });

  scene.addEventListener('pointermove', (event) => {
    const rect = scene.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    scene.style.setProperty('--scene-light-x', `${x}%`);
    scene.style.setProperty('--scene-light-y', `${y}%`);
    const eyeX = Math.max(-2, Math.min(2, (x - 66) / 10));
    const eyeY = Math.max(-1.5, Math.min(1.5, (y - 72) / 12));
    eyes.forEach((eye) => {
      eye.style.setProperty('--eye-x', `${eyeX}px`);
      eye.style.setProperty('--eye-y', `${eyeY}px`);
    });
  }, { passive: true });
}

function init() {
  document.querySelectorAll('[data-artist]').forEach((node) => { node.textContent = siteConfig.artist; });
  showUpcomingRelease();
  renderSocials();
  renderVisuals(document.getElementById('visuals-content'), siteConfig.visuals, siteConfig.timeZone);
  renderReleases(document.getElementById('releases-content'), siteConfig.releases, siteConfig.timeZone);
  renderGame(document.getElementById('game-content'), siteConfig.game);
  bindNavigation();
  document.addEventListener('click', (event) => {
    const disabledLink = event.target.closest('a[aria-disabled="true"]');
    if (disabledLink) event.preventDefault();
  });
  bindDesktopAtmosphere();
}

init();
