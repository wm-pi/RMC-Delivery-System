import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '~/shared/api/client';
import { toast } from '~/shared/lib/toast.store';
import { orderApi, type OrderListFilter } from './api';

export const orderKeys = {
  all: ['orders'] as const,
  list: (filter: OrderListFilter) => ['orders', 'list', filter] as const,
  detail: (id: number) => ['orders', 'detail', id] as const,
};

export function useOrderList(filter: OrderListFilter, enabled = true) {
  return useQuery({
    queryKey: orderKeys.list(filter),
    queryFn: () => orderApi.list(filter),
    refetchInterval: 5000,
    enabled,
  });
}

export function useOrderDetail(id: number) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => orderApi.detail(id),
    refetchInterval: 3000,
    enabled: Number.isFinite(id),
  });
}

/** 주문 단위 액션 공통 mutation — 성공 시 주문 캐시 무효화, 실패 시 토스트. successMessage가 있으면 성공 토스트 */
export function useOrderAction<TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<unknown>,
  successMessage?: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => fn(...args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      if (successMessage) toast.success(successMessage);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : '요청에 실패했습니다');
    },
  });
}
