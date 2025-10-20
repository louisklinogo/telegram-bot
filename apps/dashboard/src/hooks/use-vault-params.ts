import { useQueryStates } from "nuqs";
import { parseAsString, parseAsArrayOf, parseAsStringLiteral } from "nuqs/server";

export function useVaultParams() {
  const [params, setParams] = useQueryStates({
    q: parseAsString, // Search query
    tags: parseAsArrayOf(parseAsString), // Filter by tags
    view: parseAsStringLiteral(["grid", "list"]).withDefault("grid"), // View mode
    start: parseAsString, // Start date (ISO format)
    end: parseAsString, // End date (ISO format)
    folder: parseAsArrayOf(parseAsString), // Current folder path
  });

  return {
    params,
    setParams,
    hasFilters: Object.values(params).some((value) => value !== null && value !== "grid"),
  };
}
