import { ProductProps } from "@/type";
import { createSlice } from "@reduxjs/toolkit";

import type { PayloadAction } from "@reduxjs/toolkit";

interface CartState {
  /** Number of distinct products in the cart (shown on the cart badge) */
  numberCart: number;
  cartArr: ProductProps[];
}
const initialState: CartState = {
  numberCart: 0,
  cartArr: [],
};
export const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    getCart: (state) => {
      return { ...state };
    },
    clearAllCart: (state) => {
      state.cartArr = [];
      state.numberCart = 0;
    },
    AddAllItemCart: (state, action: PayloadAction<ProductProps[]>) => {
      state.cartArr = action.payload;
      state.numberCart = action.payload.length;
    },
    AddToCart: (state, action: PayloadAction<ProductProps | any>) => {
      const existing = state.cartArr.find(
        (item) => item.id === action.payload.id
      );
      if (existing) {
        existing.quantity =
          Number(existing.quantity ?? 0) + Number(action.payload.quantity ?? 1);
      } else {
        state.cartArr.push({
          ...action.payload,
          quantity: Number(action.payload.quantity ?? 1),
        });
      }
      state.numberCart = state.cartArr.length;
    },
    updateCartQuantity: (
      state,
      action: PayloadAction<{ id: string; quantity: number }>
    ) => {
      const item = state.cartArr.find((i) => i.id === action.payload.id);
      if (item) {
        item.quantity = Math.max(1, action.payload.quantity);
      }
    },
    deleteItemCart: (state, action: PayloadAction<ProductProps>) => {
      state.cartArr = state.cartArr.filter(
        (item) => item.id !== action.payload.id
      );
      state.numberCart = state.cartArr.length;
    },
  },
});

export const {
  AddAllItemCart,
  AddToCart,
  deleteItemCart,
  getCart,
  clearAllCart,
  updateCartQuantity,
} = cartSlice.actions;

export default cartSlice.reducer;
