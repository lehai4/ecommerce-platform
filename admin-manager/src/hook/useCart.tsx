import AxiosJWTInstance from "@/InstanceAxios";
import { apiErrorMessage } from "@/lib/apiError";
import type { ServerCart } from "@/type";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "react-toastify";
import { useAppSelector } from "./useHookRedux";

interface CartContextValue {
  cart?: ServerCart;
  loading: boolean;
  reload: () => Promise<void>;
  /** Resolves true when the item was added */
  add: (productId: string, quantity: number) => Promise<boolean>;
  setQuantity: (productId: string, quantity: number) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  clear: () => Promise<void>;
  acceptPrices: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

/** The signed-in customer's cart, kept on the server so it follows them across devices */
export const CartProvider = ({ children }: { children: ReactNode }) => {
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });
  const [cart, setCart] = useState<ServerCart>();
  const [loading, setLoading] = useState(false);

  const run = useCallback(
    async (request: () => Promise<{ data: ServerCart }>) => {
      setLoading(true);
      try {
        const { data } = await request();
        setCart(data);
        return true;
      } catch (error) {
        toast.error(apiErrorMessage(error));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user?.accessToken]
  );

  const reload = useCallback(async () => {
    await run(() => axiosAuth.get<ServerCart>("/cart"));
  }, [run]);

  useEffect(() => {
    if (user) reload();
  }, [user?.user?.id]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      loading,
      reload,
      add: (productId, quantity) =>
        run(() => axiosAuth.post<ServerCart>("/cart/items", { productId, quantity })),
      setQuantity: async (productId, quantity) => {
        await run(() =>
          axiosAuth.patch<ServerCart>(`/cart/items/${productId}`, { quantity })
        );
      },
      remove: async (productId) => {
        await run(() => axiosAuth.delete<ServerCart>(`/cart/items/${productId}`));
      },
      clear: async () => {
        await run(() => axiosAuth.delete<ServerCart>("/cart"));
      },
      acceptPrices: async () => {
        await run(() => axiosAuth.post<ServerCart>("/cart/accept-prices"));
      },
    }),
    [cart, loading, run, reload]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside <CartProvider>");
  return value;
};
