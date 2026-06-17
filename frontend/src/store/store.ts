import { configureStore } from "@reduxjs/toolkit"
import bookingReducer from "./bookingSlice"
import mapReducer from "./mapSlice"
import { apiSlice } from "./apiSlice"

export const store = configureStore({
  reducer: {
    booking: bookingReducer,
    map: mapReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

