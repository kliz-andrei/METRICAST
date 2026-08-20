import { useQuery } from '@tanstack/react-query';
import { importsApi } from '../services/imports.api';

export const importKeys = {
  all: ['imports'] as const,
  overview: () => [...importKeys.all, 'overview'] as const,
  detail: (id: string) => [...importKeys.all, 'detail', id] as const,
};

const options = { staleTime: 30_000, refetchOnWindowFocus: false };

export const useImportHistory = () =>
  useQuery({ ...options, queryKey: importKeys.all, queryFn: importsApi.list });

export const useImportOverview = () =>
  useQuery({ ...options, queryKey: importKeys.overview(), queryFn: importsApi.overview });

export const useImportDetail = (id: string | null) =>
  useQuery({
    ...options,
    queryKey: importKeys.detail(id ?? ''),
    queryFn: () => importsApi.detail(id!),
    enabled: Boolean(id),
  });
