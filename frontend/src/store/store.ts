import { configureStore } from '@reduxjs/toolkit';
import bookingReducer from './bookingSlice';
import mapReducer from './mapSlice';

export const store = configureStore({
  reducer: {
    booking: bookingReducer,
    map: mapReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
