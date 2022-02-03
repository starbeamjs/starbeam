function Counter({
  callback,
  delay,
}: {
  callback: Reactive<() => void>;
  delay: Reactive<number>;
}) {
  return component((instance) => {
    let count = cell(0);

    let token = setInterval(() => count.current++);
    instance.onDestroy(() => clearInterval(token));

    instance.render = <div>{count.current}</div>;

    return instance;
  });
}
