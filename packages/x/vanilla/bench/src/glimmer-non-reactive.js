import {
  precompileTemplate,
  setComponentTemplate,
  templateOnlyComponent,
  renderComponent,
} from '@glimmer/core';

export const oneK = () => {
  let items = [];
  const Loop = setComponentTemplate(
    precompileTemplate(`
      Glimmer (static):<br>
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
      for (let i = 0; i < 1000; i++) {
        items.push({
          a: 'Hello World',
          b: ' - ',
          c: 'Goodbye World',
        });
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
