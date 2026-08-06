const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function createWorldTransitions({ releaseScreen, world, overlay }) {
  const focusWorldEntry = () => {
    const mobile = world.querySelector('.mobile-scene');
    const desktop = world.querySelector('.desktop-scene');
    const activeScene = mobile && getComputedStyle(mobile).display !== 'none' ? mobile : desktop;
    activeScene?.querySelector('button, a')?.focus({ preventScroll: true });
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let running = false;

  async function enter() {
    if (running) return;
    running = true;
    releaseScreen.classList.add('is-leaving');

    if (reducedMotion.matches) {
      await delay(120);
      releaseScreen.hidden = true;
      world.hidden = false;
      focusWorldEntry();
      releaseScreen.classList.remove('is-leaving');
      running = false;
      return;
    }

    await delay(260);
    overlay.className = 'door-transition is-active is-opening';
    overlay.setAttribute('aria-hidden', 'false');
    await delay(1450);
    releaseScreen.hidden = true;
    world.hidden = false;
    overlay.className = 'door-transition';
    overlay.setAttribute('aria-hidden', 'true');
    releaseScreen.classList.remove('is-leaving');
    focusWorldEntry();
    running = false;
  }

  async function leave() {
    if (running) return;
    running = true;

    if (reducedMotion.matches) {
      world.hidden = true;
      releaseScreen.hidden = false;
      releaseScreen.classList.add('is-returning');
      await delay(120);
      releaseScreen.classList.remove('is-returning');
      releaseScreen.querySelector('#enter-button')?.focus({ preventScroll: true });
      running = false;
      return;
    }

    overlay.className = 'door-transition is-active is-closing';
    overlay.setAttribute('aria-hidden', 'false');
    await delay(1160);
    world.hidden = true;
    releaseScreen.hidden = false;
    releaseScreen.classList.add('is-returning');
    overlay.className = 'door-transition';
    overlay.setAttribute('aria-hidden', 'true');
    await delay(500);
    releaseScreen.classList.remove('is-returning');
    releaseScreen.querySelector('#enter-button')?.focus({ preventScroll: true });
    running = false;
  }

  return { enter, leave };
}
