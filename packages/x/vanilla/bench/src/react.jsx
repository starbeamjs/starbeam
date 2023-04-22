import { useReactive, useSetup } from "@starbeam/react";
import { Cell } from '@starbeam/universal';
import React from 'react';
import * as ReactDOM from "react-dom/client";

export const oneK = () => {
  let items = [];

  function Loop() {
    return useReactive(() => {
      return <>
        React: <br/>
        {items.map((item, index) => (
          <div title={item.a.current} 
            key={index}>{item.a.current}{item.b.current}{item.c.current}</div>
        ))}
      </>;
    });
  }

  return {
    setup: () => {
      for (let i = 0; i < 1000; i++) {
        items.push({  
          a: Cell('Hello World'),
          b: Cell(' - '),
          c: Cell('Goodbye World'),
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
