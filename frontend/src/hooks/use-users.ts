import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi, type CreateUserInput } from '../services/users.api';

const key = ['users'] as const;
const options = { staleTime: 60_000, refetchOnWindowFocus: false };
export const useUsers = () => useQuery({ queryKey: key, queryFn: usersApi.list, ...options });
export const useCreateUser = () => { const client = useQueryClient(); return useMutation({ mutationFn: (input: CreateUserInput) => usersApi.create(input), onSuccess: () => void client.invalidateQueries({ queryKey: key }) }); };
export const useUpdateUser = () => { const client = useQueryClient(); return useMutation({ mutationFn: ({ id, ...input }: { id: string } & Parameters<typeof usersApi.update>[1]) => usersApi.update(id, input), onSuccess: () => void client.invalidateQueries({ queryKey: key }) }); };
export const useSetUserActive = () => { const client = useQueryClient(); return useMutation({ mutationFn: ({ id, active }: { id: string; active: boolean }) => active ? usersApi.reactivate(id) : usersApi.deactivate(id), onSuccess: () => void client.invalidateQueries({ queryKey: key }) }); };
