import { Minus, Plus } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  value?: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  className?: string;
  step?: number;
  placeholder?: string;
};

export function QuantityInput({
  value = 0,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  onChange,
  onBlur,
  onFocus,
  className,
  step = 0.1,
  placeholder = "0",
}: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [rawValue, setRawValue] = React.useState(String(value));

  const handleInput: React.ChangeEventHandler<HTMLInputElement> = ({ currentTarget: el }) => {
    const input = el.value;
    setRawValue(input);

    // Check if input can be parsed as a valid number
    const num = Number.parseFloat(input);
    if (!Number.isNaN(num) && min <= num && num <= max) {
      onChange?.(num);
    }
  };

  const handlePointerDown = (diff: number) => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse") {
      event.preventDefault();
      inputRef.current?.focus();
    }
    const newVal = Math.min(Math.max(value + diff, min), max);
    onChange?.(newVal);
    setRawValue(String(newVal));
  };

  return (
    <div className={cn("group flex items-stretch font-mono transition-[box-shadow]", className)}>
      <button
        aria-label="Decrease"
        className="flex items-center pr-[.325em]"
        disabled={value <= min}
        onPointerDown={handlePointerDown(-1)}
        tabIndex={-1}
        type="button"
      >
        <Minus absoluteStrokeWidth className="size-2" strokeWidth={3.5} tabIndex={-1} />
      </button>
      <div className="relative grid items-center justify-items-center text-center">
        <input
          autoComplete="off"
          className="!bg-transparent flex h-6 w-full max-w-full border-0 border-transparent border-b p-0 text-center text-xs transition-colors [-moz-appearance:textfield] file:font-medium file:text-sm placeholder:text-muted-foreground focus:border-border focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          inputMode="decimal"
          max={max}
          min={min}
          onBlur={onBlur}
          onFocus={onFocus}
          onInput={handleInput}
          placeholder={placeholder}
          ref={inputRef}
          step={step}
          style={{ fontKerning: "none" }}
          type="number"
          value={rawValue === "0" ? "" : rawValue}
        />
      </div>
      <button
        aria-label="Increase"
        className="flex items-center pl-[.325em]"
        disabled={value >= max}
        onPointerDown={handlePointerDown(1)}
        tabIndex={-1}
        type="button"
      >
        <Plus absoluteStrokeWidth className="size-2" strokeWidth={3.5} tabIndex={-1} />
      </button>
    </div>
  );
}
