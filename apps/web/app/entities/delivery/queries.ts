import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '~/shared/api/client';
import { toast } from '~/shared/lib/toast.store';
import { orderKeys } from '~/entities/order/queries';
import { deliveryApi } from './api';

export const deliveryKeys = {
  active: ['deliveries', 'active'] as const,
};

/** 실시간 지도/현황용 활성 배차 폴링 */
export function useActiveDeliveries(intervalMs = 2000) {
  return useQuery({
    queryKey: deliveryKeys.active,
    queryFn: deliveryApi.listActive,
    refetchInterval: intervalMs,
  });
}

/** 배차 단위 액션 — 주문/배차 캐시 동시 무효화. successMessage가 있으면 성공 토스트 */
export function useDeliveryAction<TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<unknown>,
  successMessage?: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => fn(...args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.active });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      if (successMessage) toast.success(successMessage);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : '요청에 실패했습니다');
    },
  });
}
