import { useQuery } from '@tanstack/react-query';
import { masterApi } from './api';

export function usePlants() {
  return useQuery({ queryKey: ['plants'], queryFn: masterApi.plants, staleTime: 60_000 });
}

export function useSites() {
  return useQuery({ queryKey: ['sites'], queryFn: masterApi.sites, staleTime: 60_000 });
}
