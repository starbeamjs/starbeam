import { setup as manual } from './src/manual';

async function boot() {
  console.log('booting');

  manual();

  console.log('ready');
}

const readiness = ['interactive', 'complete', 'ready'];

console.log('waiting for boot');
if (readiness.includes(document.readyState)) {
  boot();
} else {
  window.addEventListener('DOMContentLoaded', () => {
    console.info(`DOMContentLoaded`);
    boot();
  });
}

