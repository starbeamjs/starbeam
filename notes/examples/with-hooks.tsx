function interval(callback, delay) {
  return hook((instance) => {
    let token = setInterval(() => callback.current(), delay.current);
    instance.onDestroy(() => clearInterval(token));
  });
}

function Counter({
  callback,
  delay,
}: {
  callback: Reactive<() => void>;
  delay: Reactive<number>;
}) {
  return component((instance) => {
    let count = cell(0);

    instance.use(interval(() => count.current++, delay));

    return <div>{count.current}</div>;
  });
}
