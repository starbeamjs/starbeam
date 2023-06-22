import type {
  FormEvent,
  HTMLInputTypeAttribute,
  InputHTMLAttributes,
} from "react";

export function Jsonify({ value }: { value: unknown }): JSX.Element {
  return <>{JSON.stringify(value, null, 2)}</>;
}

interface FieldAttributes extends InputHTMLAttributes<HTMLInputElement> {
  type: HTMLInputTypeAttribute;
  onUpdate: (value: string) => void;
  value: string | number;
  label: string;
}

export function Field({
  type = "text",
  label,
  onUpdate,
  value,
  ...attrs
}: FieldAttributes): JSX.Element {
  function updateForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as {
      field: string;
    };

    onUpdate(data.field);
  }

  return (
    <form onSubmit={updateForm} onInput={updateForm}>
      <label>{label}</label>
      <input
        data-1p-ignore
        {...attrs}
        type={type}
        name="field"
        defaultValue={value}
      />
    </form>
  );
}

export function Chip({
  title,
  value,
}: {
  title: string;
  value: number;
}): JSX.Element {
  return (
    <span className="p-chip">
      <span className="p-chip__value">{title}</span>
      <span className="p-badge">{value}</span>
    </span>
  );
}
