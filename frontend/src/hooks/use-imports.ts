import { useQuery } from "@tanstack/react-query";
import { importsApi } from "../services/imports.api";

export const importKeys = {
  all: ["imports"] as const,
  overview: () => [...importKeys.all, "overview"] as const,
  detail: (id: string) => [...importKeys.all, "detail", id] as const,
  deletionImpact: (id: string) =>
    [...importKeys.all, "deletion-impact", id] as const,
};

const options = { staleTime: 30_000, refetchOnWindowFocus: false };

export const useImportHistory = () =>
  useQuery({ ...options, queryKey: importKeys.all, queryFn: importsApi.list });

export const useImportOverview = () =>
  useQuery({
    ...options,
    queryKey: importKeys.overview(),
    queryFn: importsApi.overview,
  });

export const useImportDetail = (id: string | null) =>
  useQuery({
    ...options,
    queryKey: importKeys.detail(id ?? ""),
    queryFn: () => importsApi.detail(id!),
    enabled: Boolean(id),
  });

export const useImportDeletionImpact = (id: string | null, enabled: boolean) =>
  useQuery({
    ...options,
    queryKey: importKeys.deletionImpact(id ?? ""),
    queryFn: () => importsApi.deletionImpact(id!),
    enabled: Boolean(id) && enabled,
  });
