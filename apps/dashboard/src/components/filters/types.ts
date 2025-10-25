export type FilterFieldType =
  | "text"
  | "select"
  | "multi"
  | "date_range"
  | "number_range"
  | "boolean";

export type FilterOption = { value: string; label: string };

export type FilterFieldDef = {
  key: string; // main key for select/multi/text/boolean
  label: string;
  type: FilterFieldType;
  icon?: React.ComponentType<any>;
  options?: FilterOption[]; // for select/multi
  map?: { start?: string; end?: string; min?: string; max?: string }; // for ranges
};

export type FilterValue = Record<string, unknown>;
