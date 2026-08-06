const focusableSelector = 'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function createPanelManager() {
  let activePanel = null;
  let opener = null;

  const onKeydown = (event) => {
    if (!activePanel) return;
    if (event.key === 'Escape') close();
    if (event.key !== 'Tab') return;

    const nodes = [...activePanel.querySelectorAll(focusableSelector)].filter((node) => !node.hidden);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  async function open(name, trigger) {
    const panel = document.getElementById(`panel-${name}`);
    if (!panel || activePanel) return;
    opener = trigger || document.activeElement;
    activePanel = panel;
    document.body.classList.add('is-locked');
    panel.hidden = false;
    panel.classList.add('is-opening');
    document.addEventListener('keydown', onKeydown);
    panel.querySelector('[data-close-panel]')?.focus({ preventScroll: true });
    await wait(580);
    panel.classList.remove('is-opening');
  }

  async function close() {
    if (!activePanel) return;
    const panel = activePanel;
    panel.classList.add('is-closing');
    await wait(430);
    panel.hidden = true;
    panel.classList.remove('is-closing');
    document.body.classList.remove('is-locked');
    document.removeEventListener('keydown', onKeydown);
    activePanel = null;
    opener?.focus?.({ preventScroll: true });
    opener = null;
  }

  document.querySelectorAll('[data-close-panel]').forEach((button) => button.addEventListener('click', close));
  return { open, close };
}
