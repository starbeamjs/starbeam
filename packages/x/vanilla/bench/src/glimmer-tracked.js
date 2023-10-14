import {
  precompileTemplate,
  setComponentTemplate,
  templateOnlyComponent,
  renderComponent,
} from '@glimmer/core';

import { tracked } from '@glimmer/tracking';

export const oneK = () => {
  let items = [];
  const Loop = setComponentTemplate(
    precompileTemplate(`
      Glimmer:<br>
      {{#each items as |item|}}
        <div 
          title={{item.a}}>{{item.a}}{{item.b}}{{item.c}}</div>
      {{/each}}
    `,
      { strictMode: true, scope: () => ({ items }) }
    ), 
    templateOnlyComponent()
  ); 

  return {
    setup: () => {
      class Item {
        @tracked a = 'Hello World';
        @tracked b = ' - ';
        @tracked c = 'Goodbye World';
      }

      for (let i = 0; i < 1000; i++) {
        items.push(new Item());
      }
    },
    render: () => {
      const element = document.querySelector('#bench-container');
      renderComponent(Loop, {
        element: element,
        owner: {},
      });
    },
  };
} 
