import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../api/cart';
import { useAuthStore } from '../stores/auth';

export function useCart() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const enabled = !!user;

  const query = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.get(),
    enabled,
    staleTime: 10_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cart'] });

  const add = useMutation({
    mutationFn: ({ productId, quantity = 1 }: { productId: string; quantity?: number }) => cartApi.add(productId, quantity),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) => cartApi.update(productId, quantity),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (productId: string) => cartApi.remove(productId),
    onSuccess: invalidate,
  });

  const clear = useMutation({
    mutationFn: () => cartApi.clear(),
    onSuccess: invalidate,
  });

  return {
    cart: query.data?.cart ?? { userId: '', items: [], cartCount: 0, subtotal: 0 },
    isLoading: query.isLoading,
    add,
    update,
    remove,
    clear,
  };
}
