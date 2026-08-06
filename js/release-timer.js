const pad = (value) => String(Math.max(0, value)).padStart(2, '0');

export function createReleaseTimer(targetDate, elements, onComplete) {
  const target = new Date(targetDate).getTime();
  let intervalId = null;
  let finished = false;

  const update = () => {
    const distance = target - Date.now();
    if (!Number.isFinite(target) || distance <= 0) {
      elements.days.textContent = '00';
      elements.hours.textContent = '00';
      elements.minutes.textContent = '00';
      elements.seconds.textContent = '00';
      if (!finished) {
        finished = true;
        window.clearInterval(intervalId);
        onComplete?.();
      }
      return;
    }

    const days = Math.floor(distance / 86_400_000);
    const hours = Math.floor((distance / 3_600_000) % 24);
    const minutes = Math.floor((distance / 60_000) % 60);
    const seconds = Math.floor((distance / 1_000) % 60);

    elements.days.textContent = pad(days);
    elements.hours.textContent = pad(hours);
    elements.minutes.textContent = pad(minutes);
    elements.seconds.textContent = pad(seconds);
  };

  update();
  intervalId = window.setInterval(update, 1000);
  return () => window.clearInterval(intervalId);
}
