import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '~/shared/api/client';
import { vehicleApi } from './api';

export const vehicleKeys = {
  list: (plantId?: number) => ['vehicles', plantId ?? 'all'] as const,
};

export function useVehicleList(plantId?: number) {
  return useQuery({
    queryKey: vehicleKeys.list(plantId),
    queryFn: () => vehicleApi.list(plantId),
    refetchInterval: 5000,
  });
}

export function useVehicleAction<TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => fn(...args),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
    onError: (err) => {
      alert(err instanceof ApiError ? err.message : '요청에 실패했습니다');
    },
  });
}
