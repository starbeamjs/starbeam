import { setup as manual } from './src/manual';
import { setup as bench } from './src/bench';

async function boot() {
  console.log('booting');

  manual();
  bench();

  console.log('ready');
}

const readiness = ['interactive', 'complete', 'ready'];

if (readiness.includes(document.readyState)) {
  boot();
} else {
  window.addEventListener('DOMContentLoaded', () => {
    console.info(`DOMContentLoaded`);
    boot();
  });
}

