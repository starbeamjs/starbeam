import type {
  FormEvent,
  HTMLInputTypeAttribute,
  InputHTMLAttributes,
} from "react";

export function Jsonify({ value }: { value: unknown }): JSX.Element {
  return <>{JSON.stringify(value, null, 2)}</>;
}

export type Async<T> =
  | {
      status: "loading";
    }
  | {
      status: "reloading";
    }
  | {
      status: "success";
      value: T;
    }
  | {
      status: "error";
      error: unknown;
    };

interface FieldAttributes extends InputHTMLAttributes<HTMLInputElement> {
  type: HTMLInputTypeAttribute;
  onUpdate: (value: string) => void;
  value: string | number;
}

export function Field({
  type = "text",
  onUpdate,
  value,
  ...attrs
}: FieldAttributes): JSX.Element {
  function updateForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as {
      field: string;
    };

    if (data.field) {
      onUpdate(data.field);
    }
  }

  return (
    <form onSubmit={updateForm} onInput={updateForm}>
      <label>User ID</label>
      <input
        data-1p-ignore
        required
        {...attrs}
        type={type}
        name="field"
        value={value}
        onChange={() => void 0}
      />
    </form>
  );
}
