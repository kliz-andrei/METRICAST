import { createContext, useCallback, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { SalesFilters } from "../services/sales-analytics.api";

const STORAGE_KEY = "metricast.sales-date-range";
const DEFAULT_DATE_RANGE: Pick<SalesFilters, "startDate" | "endDate"> = { startDate: "2026-08-01", endDate: "2026-08-31" };
type SalesFilterContextValue = { filters: SalesFilters; setFilters: Dispatch<SetStateAction<SalesFilters>> };
const SalesFilterContext = createContext<SalesFilterContextValue | null>(null);

function initialDateRange(): Pick<SalesFilters, "startDate" | "endDate"> {
  if (typeof window === "undefined") return DEFAULT_DATE_RANGE;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return DEFAULT_DATE_RANGE;
  try {
    const parsed = JSON.parse(stored) as Pick<SalesFilters, "startDate" | "endDate">;
    return { startDate: parsed.startDate, endDate: parsed.endDate };
  } catch { return DEFAULT_DATE_RANGE; }
}

function persistDateRange(filters: SalesFilters) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ startDate: filters.startDate, endDate: filters.endDate }));
}

/** A single app-level filter store. Only dates persist across browser refreshes. */
export function SalesFiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilterState] = useState<SalesFilters>(initialDateRange);
  const setFilters = useCallback<Dispatch<SetStateAction<SalesFilters>>>((next) => {
    setFilterState((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      persistDateRange(resolved);
      return resolved;
    });
  }, []);
  return <SalesFilterContext.Provider value={{ filters, setFilters }}>{children}</SalesFilterContext.Provider>;
}

export const useSalesFilters = () => {
  const value = useContext(SalesFilterContext);
  if (!value) throw new Error("Sales filter provider is required.");
  return value;
};
