import { useReactive, useResource } from "@starbeam/react";
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
  const clock = useResource(Clock);

  return useReactive(
    () => (
      <div className="p-card">
        <h3>The time is...</h3>
        <p className="p-card__content">
          {clock.format({
            dateStyle: timeFormat,
            timeStyle: dateFormat,
          })}
        </p>
      </div>
    ),
    [timeFormat, dateFormat]
  );
}

const Clock = Resource(({ on }) => {
  const now = Cell(new Date());

  on.setup(() => {
    const timer = setInterval(() => {
      now.set(new Date());
    }, 1000);

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
