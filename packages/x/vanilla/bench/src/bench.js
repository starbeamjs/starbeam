import { Bench } from "tinybench";
import * as vanilla from './vanilla';
import * as glimmer from './glimmer';
import * as react from './react';

let output;
export function setup() {
  let benchAll = document.getElementById('bench_all');
  output = document.getElementById('output');

  let isBenching = false;
  benchAll.addEventListener('click', async () => {
    if (isBenching) return;

    isBenching = true;

    await oneKElements();

    isBenching = false;
  });

function printBench(name, bench) {
  console.info(
    `------------------------\n` 
    + name 
    + `\n------------------------\n`);

  let result = (
    bench.tasks.map(({ name, result }) => ({
      "Task Name": name,
      "Hz": result?.hz,
      "p99": result?.p99,
      "Average Time (ps)": result?.mean * 1000, 
      "Variance (ps)": result?.variance * 1000,
      "Error": result?.error,

    }))
  );

  output.innerHTML += JSON.stringify(result, null, 3);
}

/**
  * React will re-use a cache unless we totally destroy
  * and use a separate render root.
  *
  * Is this use case common in real world? 
  * Or was it implemented to improve benchmark scores?
  */
function replaceTarget() {
  let previous = document.querySelector('#bench-container'); 

  previous.remove();

  let newDiv = document.createElement('div');
  newDiv.id = 'bench-container';

  document.body.appendChild(newDiv);
}

async function oneKElements() {
  const rendering = new Bench({ time: 1_000 /* 1s */ });

  let vanillaOneK = vanilla.oneK();
  let glimmerOneK = glimmer.oneK();
  let reactOneK = react.oneK();

  rendering.add("Vanilla", vanillaOneK.render, {
    beforeAll: () => vanillaOneK.setup(), 
    beforeEach: () => replaceTarget(),
  });

  rendering.add("Glimmer", glimmerOneK.render, {
    beforeAll: () => glimmerOneK.setup(),
    beforeEach: () => replaceTarget(),
  });

  // rendering.add("React", reactOneK.render, {
  //   beforeAll: () => reactOneK.setup(), 
  //   beforeEach: () => replaceTarget(),
  // });

  rendering.addEventListener('error', (error) => {
    console.error(error);
  });

  rendering.tasks.forEach((task) => {
    task.addEventListener("complete", () => {
      console.log(`Finished ${task.name}...`);
    });
  });
  await rendering.run();

  printBench('rendering', rendering);
}

}
