import * as vanilla from './vanilla';
import * as glimmer from './glimmer';
import * as react from './react';

async function measured(name, fn) {
  performance.mark(`${name} start`);

  await fn();

  performance.mark(`${name} end`);

  let measurement = performance.measure(name, `${name} start`, `${name} end`);

  output.innerHTML += `\n${name}: ${measurement.duration}`;
}

let output;
export function setup() {
  let clear = document.getElementById('clear'); 
  output = document.getElementById('output');

  let runVanilla = document.getElementById('run_vanilla'); 
  let runGlimmer = document.getElementById('run_glimmer'); 
  let runReact = document.getElementById('run_react'); 

  output = document.getElementById('output');

  clear.addEventListener('click', () => {
    document.getElementById('bench-container').innerHTML = '';
  });

  runVanilla.addEventListener('click', () => {
    let vanillaOneK = vanilla.oneK();
    vanillaOneK.setup();
    measured('Vanilla', vanillaOneK.render);
  });

  runGlimmer.addEventListener('click', () => {
    let glimmerOneK = glimmer.oneK();
    glimmerOneK.setup();
    measured('Glimmer', glimmerOneK.render);
  });

  runReact.addEventListener('click', () => {
    let reactOneK = react.oneK();
    reactOneK.setup();
    measured('React', reactOneK.render);
  });

}
