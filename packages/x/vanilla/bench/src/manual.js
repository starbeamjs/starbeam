import * as vanillaStarbeam from './vanilla-starbeam';
import * as glimmerTracked from './glimmer-tracked';
import * as glimmerNonReactive from './glimmer-non-reactive';
import * as reactStarbeam from './react-starbeam';
import * as reactNonReactive from './react-non-reactive';

let output;
async function measured(name, fn) {
  performance.mark(`${name} start`);

  await fn();

  performance.mark(`${name} end`);

  let measurement = performance.measure(name, `${name} start`, `${name} end`);

  output.innerHTML += `\n${name}: ${measurement.duration}ms`;
}

export function setup() {
  let clear = document.getElementById('clear'); 
  output = document.getElementById('output');

  clear.addEventListener('click', () => {
    document.getElementById('bench-container').innerHTML = '';
  });

  function id(theId) {
    return document.getElementById(theId);
  }

  function setup(impl, button, name) {
    button.addEventListener('click', () => {
      let scenario = impl.oneK();
      scenario.setup();
      measured(name, scenario.render);
    });
  }

  setup(vanillaStarbeam, id('vanilla-starbeam'), 'Vanilla');
  setup(glimmerTracked, id('glimmer-tracked'), 'Glimmer w/ @tracked');
  setup(glimmerNonReactive, id('glimmer-static'), 'Glimmer non-reactive');
  setup(reactStarbeam, id('react-starbeam'), 'React w/ Starbeam');
  setup(reactNonReactive, id('react-static'), 'React non-reactive');
}
