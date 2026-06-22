import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Reservation {
  bookingId: string;
  spotId: string;
  garageId: string;
  expiresAt: string; // ISO string representation of time
  secondsRemaining: number;
}

interface BookingState {
  activeReservations: Reservation[];
}

const initialState: BookingState = {
  activeReservations: [],
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setReservation: (state, action: PayloadAction<Omit<Reservation, 'secondsRemaining'>>) => {
      const rawExpires = action.payload.expiresAt;
      const formattedExpires = rawExpires.endsWith('Z') ? rawExpires : `${rawExpires}Z`;
      const expiresTime = new Date(formattedExpires).getTime();
      const now = new Date().getTime();
      const secondsRemaining = Math.max(0, Math.floor((expiresTime - now) / 1000));
      
      const newRes = {
        ...action.payload,
        secondsRemaining,
      };

      const idx = state.activeReservations.findIndex(r => r.bookingId === newRes.bookingId);
      if (idx >= 0) {
        state.activeReservations[idx] = newRes;
      } else {
        state.activeReservations.push(newRes);
      }
    },
    clearReservation: (state, action: PayloadAction<string | undefined>) => {
      if (action.payload) {
        state.activeReservations = state.activeReservations.filter(r => r.bookingId !== action.payload);
      } else {
        state.activeReservations = [];
      }
    },
    tickTimer: (state) => {
      state.activeReservations = state.activeReservations
        .map(r => ({
          ...r,
          secondsRemaining: r.secondsRemaining - 1
        }))
        .filter(r => r.secondsRemaining > 0);
    },
  },
});

export const { setReservation, clearReservation, tickTimer } = bookingSlice.actions;
export default bookingSlice.reducer;
