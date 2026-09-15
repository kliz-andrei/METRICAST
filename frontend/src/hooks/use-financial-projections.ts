import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  financialProjectionsApi,
  type FinancialFilters,
} from '../services/financial-projections.api';

export const financialProjectionKeys = {
  all: ['financial-projections'] as const,
  summary: (filters: FinancialFilters) => [...financialProjectionKeys.all, 'summary', filters] as const,
  coverage: () => [...financialProjectionKeys.all, 'coverage'] as const,
  settings: () => [...financialProjectionKeys.all, 'settings'] as const,
  products: () => [...financialProjectionKeys.all, 'products'] as const,
};

const options = { staleTime: 60_000, refetchOnWindowFocus: false };

export const useFinancialProjectionSummary = (filters: FinancialFilters, enabled: boolean) =>
  useQuery({
    ...options,
    queryKey: financialProjectionKeys.summary(filters),
    queryFn: () => financialProjectionsApi.summary(filters),
    enabled,
  });

export const useFinancialCostCoverage = () =>
  useQuery({ ...options, queryKey: financialProjectionKeys.coverage(), queryFn: () => financialProjectionsApi.coverage() });

export const useFinancialSettings = () =>
  useQuery({ ...options, queryKey: financialProjectionKeys.settings(), queryFn: financialProjectionsApi.settings });

export const useCostedProducts = () =>
  useQuery({ ...options, queryKey: financialProjectionKeys.products(), queryFn: financialProjectionsApi.products });

export const useUpdateFinancialSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: financialProjectionsApi.updateSettings,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financialProjectionKeys.settings() });
      void queryClient.invalidateQueries({ queryKey: financialProjectionKeys.all });
    },
  });
};

export const useUpdateProductCost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, unitCost }: { id: string; unitCost: number | null }) => financialProjectionsApi.updateProductCost(id, unitCost),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financialProjectionKeys.products() });
      void queryClient.invalidateQueries({ queryKey: financialProjectionKeys.coverage() });
      void queryClient.invalidateQueries({ queryKey: financialProjectionKeys.all });
    },
  });
};
