import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../services/reports.api';

export const useReportMetadata = () => useQuery({ queryKey: ['reports', 'metadata'], queryFn: reportsApi.metadata, staleTime: 5 * 60_000, refetchOnWindowFocus: false });
