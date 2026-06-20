import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Reservation {
  bookingId: string;
  spotId: string;
  garageId: string;
  expiresAt: string; // ISO string representation of time
  secondsRemaining: number;
}

interface BookingState {
  activeReservation: Reservation | null;
}

const initialState: BookingState = {
  activeReservation: null,
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
      
      state.activeReservation = {
        ...action.payload,
        secondsRemaining,
      };
    },
    clearReservation: (state) => {
      state.activeReservation = null;
    },
    tickTimer: (state) => {
      if (state.activeReservation) {
        if (state.activeReservation.secondsRemaining > 0) {
          state.activeReservation.secondsRemaining -= 1;
        } else {
          state.activeReservation = null; // Automatically clear on expiry
        }
      }
    },
  },
});

export const { setReservation, clearReservation, tickTimer } = bookingSlice.actions;
export default bookingSlice.reducer;
