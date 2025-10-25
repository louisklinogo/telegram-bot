import { NumericFormat, type NumericFormatProps } from "react-number-format";
import { Input } from "./input";

export function CurrencyInput({
  thousandSeparator = true,
  decimalScale = 2,
  fixedDecimalScale = true,
  ...props
}: NumericFormatProps) {
  return (
    <NumericFormat
      customInput={Input}
      decimalScale={decimalScale}
      fixedDecimalScale={fixedDecimalScale}
      thousandSeparator={thousandSeparator}
      {...props}
    />
  );
}
