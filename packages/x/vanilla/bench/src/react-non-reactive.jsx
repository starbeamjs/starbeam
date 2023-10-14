import React from 'react';
import * as ReactDOM from "react-dom/client";

export const oneK = () => {
  let items = [];

  function Loop() {
    return <>
      React (no Starbeam, {items.length}): <br/>
      {items.map((item, index) => (
        <div 
          title={item.a.current} 
          key={index}
        >{item.a}{item.b}{item.c}</div>
      ))}
    </>;
  }

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
      let body = document.querySelector('#bench-container');
      const root = ReactDOM.createRoot(body);
      root.render(<Loop />);
    }
  };
}
