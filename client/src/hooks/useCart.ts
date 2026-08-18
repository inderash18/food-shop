import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../api/cart';
import { useAuthStore } from '../stores/auth';
import type { Cart, CartItem } from '../lib/types';

export function useCart() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const enabled = !!user;

  const query = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.get(),
    enabled,
    staleTime: 30_000, // Keep cached data fresh for 30s to avoid repeated network hits
  });

  const cart = query.data?.cart ?? { userId: '', items: [], cartCount: 0, subtotal: 0 };

  // Optimistic Add to Cart
  const add = useMutation({
    mutationFn: ({ productId, quantity = 1 }: { productId: string; quantity?: number }) =>
      cartApi.add(productId, quantity),
    onMutate: async ({ productId, quantity = 1 }) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData<{ cart: Cart }>(['cart']);

      if (previousCart?.cart) {
        const existingItem = previousCart.cart.items.find((i) => i.productId === productId);
        let newItems: CartItem[];

        if (existingItem) {
          newItems = previousCart.cart.items.map((item) =>
            item.productId === productId
              ? { ...item, quantity: item.quantity + quantity, subtotal: (item.quantity + quantity) * item.price }
              : item
          );
        } else {
          newItems = [
            ...previousCart.cart.items,
            {
              productId,
              name: 'Meal Item',
              quantity,
              price: 0,
              isVeg: true,
              available: true,
              stockAvailable: 10,
              subtotal: 0,
            },
          ];
        }

        const newCount = newItems.reduce((acc, i) => acc + i.quantity, 0);
        const newSubtotal = newItems.reduce((acc, i) => acc + i.subtotal, 0);

        queryClient.setQueryData<{ cart: Cart }>(['cart'], {
          cart: {
            ...previousCart.cart,
            items: newItems,
            cartCount: newCount,
            subtotal: newSubtotal,
          },
        });
      }

      return { previousCart };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  // Optimistic Update Quantity
  const update = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartApi.update(productId, quantity),
    onMutate: async ({ productId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData<{ cart: Cart }>(['cart']);

      if (previousCart?.cart) {
        const newItems = previousCart.cart.items
          .map((item) => {
            if (item.productId === productId) {
              return quantity > 0
                ? { ...item, quantity, subtotal: quantity * item.price }
                : null;
            }
            return item;
          })
          .filter(Boolean) as CartItem[];

        const newCount = newItems.reduce((acc, i) => acc + i.quantity, 0);
        const newSubtotal = newItems.reduce((acc, i) => acc + i.subtotal, 0);

        queryClient.setQueryData<{ cart: Cart }>(['cart'], {
          cart: {
            ...previousCart.cart,
            items: newItems,
            cartCount: newCount,
            subtotal: newSubtotal,
          },
        });
      }

      return { previousCart };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  // Optimistic Remove Item
  const remove = useMutation({
    mutationFn: (productId: string) => cartApi.remove(productId),
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData<{ cart: Cart }>(['cart']);

      if (previousCart?.cart) {
        const newItems = previousCart.cart.items.filter((item) => item.productId !== productId);
        const newCount = newItems.reduce((acc, i) => acc + i.quantity, 0);
        const newSubtotal = newItems.reduce((acc, i) => acc + i.subtotal, 0);

        queryClient.setQueryData<{ cart: Cart }>(['cart'], {
          cart: {
            ...previousCart.cart,
            items: newItems,
            cartCount: newCount,
            subtotal: newSubtotal,
          },
        });
      }

      return { previousCart };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const clear = useMutation({
    mutationFn: () => cartApi.clear(),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const itemCount = cart.cartCount ?? cart.items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cart.subtotal ?? cart.items.reduce((s, i) => s + i.subtotal, 0);

  const addItem = (product: any, quantity = 1, _addons?: string[], _notes?: string) => {
    const productId = typeof product === 'string' ? product : product._id;
    add.mutate({ productId, quantity });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      remove.mutate(productId);
    } else {
      update.mutate({ productId, quantity });
    }
  };

  const removeItem = (productId: string) => {
    remove.mutate(productId);
  };

  const clearCart = () => {
    clear.mutate();
  };

  return {
    cart,
    isLoading: query.isLoading,
    add,
    update,
    remove,
    clear,
    itemCount,
    subtotal,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  };
}
