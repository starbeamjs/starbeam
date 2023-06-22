import reactive from "@starbeam/collections";
import { setup, useReactive, useResource } from "@starbeam/react";
import { Cell, Resource } from "@starbeam/universal";
import { useId, useState } from "react";

type DateTimeStyle = Intl.DateTimeFormatOptions["timeStyle"];

export default function App(): JSX.Element {
  const [timeFormat, setTimeFormat] = useState("full" as DateTimeStyle);
  const [dateFormat, setDateFormat] = useState("full" as DateTimeStyle);

  return (
    <>
      <section className="p-card--highlighted">
        <SelectStyle
          label="Time format"
          style={timeFormat}
          setStyle={setTimeFormat}
        />

        <SelectStyle
          label="Date format"
          style={dateFormat}
          setStyle={setDateFormat}
        />

        <HelloClock timeFormat={timeFormat} dateFormat={dateFormat} />
      </section>
    </>
  );
}

function SelectStyle({
  style,
  setStyle,
  label,
}: {
  style: DateTimeStyle;
  setStyle: (style: DateTimeStyle) => void;
  label: string;
}): JSX.Element {
  const id = useId();

  return (
    <>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={style}
        onChange={(e) => void setStyle(e.target.value as DateTimeStyle)}
      >
        <option value="full">full</option>
        <option value="long">long</option>
        <option value="medium">medium</option>
        <option value="short">short</option>
      </select>
    </>
  );
}

function HelloClock({
  timeFormat,
  dateFormat,
}: {
  timeFormat: DateTimeStyle;
  dateFormat: DateTimeStyle;
}): JSX.Element {
  const speed = setup(() => reactive.object({ updateMS: 1000 }));
  const clock = useResource(() => Clock(speed), [speed]);

  return useReactive(
    () => (
      <div className="p-card">
        <div className="p-card">
          <h4>Clock updates every {speed.updateMS}ms </h4>
          <button onClick={() => (speed.updateMS /= 2)}>Speed Up</button>
          <button onClick={() => (speed.updateMS *= 2)}>Slow Down</button>
        </div>
        <h3>The time is...</h3>
        <p className="p-card__content">
          {clock.format({
            dateStyle: timeFormat,
            timeStyle: dateFormat,
          })}
        </p>
      </div>
    ),
    []
  );
}

function Clock(speed: { updateMS: number }) {
  return Resource(({ on }) => {
    console.log("creating resource");
    const now = Cell(new Date());

    on.setup(() => {
      console.log("setting up");
      const timer = setInterval(() => {
        now.set(new Date());
      }, speed.updateMS);

      return () => void clearInterval(timer);
    });

    return {
      format({
        dateStyle,
        timeStyle,
      }: {
        dateStyle: DateTimeStyle;
        timeStyle: DateTimeStyle;
      }) {
        return new Intl.DateTimeFormat("en-US", {
          dateStyle,
          timeStyle,
        }).format(now.current);
      },
    };
  });
}
