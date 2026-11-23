import { combineReducers, configureStore } from "@reduxjs/toolkit";
import authReducer from "../slice/authSlice";
import {
  createMigrate,
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";

const persistConfig = {
  key: "root",
  // v2: the cart moved to the server, drop the old local one
  version: 2,
  storage,
  migrate: createMigrate(
    {
      2: (state: any) => {
        if (!state) return state;
        const { cart: _dropped, ...rest } = state;
        return rest;
      },
    },
    { debug: false }
  ),
};
const rootReducer = combineReducers({
  auth: authReducer,
});
const persistedReducer = persistReducer<ReturnType<typeof rootReducer>>(
  persistConfig,
  rootReducer
);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const permistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
