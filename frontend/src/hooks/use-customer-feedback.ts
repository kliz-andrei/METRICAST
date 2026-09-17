import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customerFeedbackApi } from '../services/customer-feedback.api';
export const customerFeedbackKeys = { overview: ['customer-feedback', 'overview'] as const };
export const useCustomerFeedbackOverview = () => useQuery({ queryKey: customerFeedbackKeys.overview, queryFn: customerFeedbackApi.overview });
export const usePreviewCustomerFeedback = () => useMutation({ mutationFn: customerFeedbackApi.preview });
export const useImportCustomerFeedback = () => { const client = useQueryClient(); return useMutation({ mutationFn: customerFeedbackApi.import, onSuccess: () => void client.invalidateQueries({ queryKey: customerFeedbackKeys.overview }) }); };
export const useDeleteCustomerFeedback = () => { const client = useQueryClient(); return useMutation({ mutationFn: customerFeedbackApi.remove, onSuccess: () => void client.invalidateQueries({ queryKey: customerFeedbackKeys.overview }) }); };
