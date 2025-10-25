"use client";

import { Command as CommandPrimitive } from "cmdk";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { CommandGroup, CommandInput, CommandItem, CommandList } from "./command";
import { Icons } from "./icons";
import { Spinner } from "./spinner";

export type Option = {
  id: string;
  name: string;
  component?: () => React.ReactNode;
  data?: unknown;
};

type ComboboxProps = {
  options: Option[];
  value?: Option;
  onSelect?: (value?: Option) => void;
  onCreate?: (value?: string) => void;
  onRemove?: () => void;
  onValueChange?: (value: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  classNameList?: string;
  autoFocus?: boolean;
  showIcon?: boolean;
  CreateComponent?: React.ComponentType<{ value: string }>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
};

export const Combobox = ({
  options,
  placeholder,
  value,
  onSelect,
  onRemove,
  onCreate,
  disabled,
  className,
  classNameList,
  isLoading = false,
  showIcon = true,
  autoFocus,
  onValueChange,
  CreateComponent,
  open: controlledOpen,
  onOpenChange,
  onFocus,
}: ComboboxProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalIsOpen, setInternalOpen] = useState(false);
  const [selected, setSelected] = useState<Option | undefined>(value as Option);
  const [inputValue, setInputValue] = useState<string>(value?.name || "");

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalIsOpen;

  const handleOpenChange = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalOpen(open);
    }
  };

  const handleOnValueChange = (value: string) => {
    setInputValue(value);
    onValueChange?.(value);

    if (value) {
      handleOpenChange(true);
    } else {
      handleOpenChange(false);
    }
  };

  const handleOnRemove = () => {
    setSelected(undefined);
    setInputValue("");
    onRemove?.();
  };

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (!inputRef.current?.contains(document.activeElement)) {
        handleOpenChange(false);
        setInputValue(selected?.name ?? "");
      }
    }, 150);
  }, [selected, handleOpenChange]);

  const handleOnFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    onFocus?.(event);
  };

  const handleSelectOption = useCallback(
    (selectedOption: Option) => {
      setInputValue(selectedOption.name);

      setSelected(selectedOption);
      onSelect?.(selectedOption);

      setTimeout(() => {
        inputRef?.current?.blur();
      }, 0);
    },
    [onSelect]
  );

  return (
    <CommandPrimitive className="w-full">
      <div className="relative flex w-full items-center">
        {showIcon && (
          <Icons.Search className="pointer-events-none absolute left-4 h-[18px] w-[18px]" />
        )}

        <CommandInput
          autoFocus={autoFocus}
          className={className}
          disabled={disabled}
          onBlur={handleBlur}
          onFocus={handleOnFocus}
          onValueChange={handleOnValueChange}
          placeholder={placeholder}
          ref={inputRef}
          value={inputValue}
        />

        {isLoading && <Spinner className="absolute right-2 h-[16px] w-[16px] text-dark-gray" />}

        {!isLoading && selected && onRemove && (
          <Icons.Close className="absolute right-2 h-[18px] w-[18px]" onClick={handleOnRemove} />
        )}
      </div>

      <div className="relative w-full">
        <CommandList
          className="fade-in-0 zoom-in-95 w-full animate-in outline-none"
          hidden={!isOpen}
        >
          {isOpen && (
            <CommandGroup
              className={cn(
                "absolute z-10 max-h-[250px] w-full overflow-auto border bg-background px-2 py-2",
                classNameList
              )}
            >
              {options?.map(({ component: Component, ...option }) => (
                <CommandItem
                  className="flex w-full items-center gap-2 px-2"
                  key={option.id}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onSelect={() => handleSelectOption(option)}
                  value={`${option.name}_${option.id}`}
                >
                  {Component ? <Component /> : option.name}
                </CommandItem>
              ))}

              {onCreate &&
                !options?.find((o) => o.name.toLowerCase() === inputValue.toLowerCase()) && (
                  <CommandItem
                    key={inputValue}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onSelect={() => onCreate(inputValue)}
                    value={inputValue}
                  >
                    {CreateComponent ? (
                      <CreateComponent value={inputValue} />
                    ) : (
                      `Create "${inputValue}"`
                    )}
                  </CommandItem>
                )}
            </CommandGroup>
          )}
        </CommandList>
      </div>
    </CommandPrimitive>
  );
};
