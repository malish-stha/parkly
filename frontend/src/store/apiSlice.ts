import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

export interface SpotConfig {
  spotNumber: string;
  vehicleType: "STANDARD" | "EV" | "SUV";
}

export interface GaragePayload {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  ratePerHour: number;
  imageUrl: string;
  spots: SpotConfig[];
}

export interface ParkingSpotDto {
  id: number;
  spotNumber: string;
  vehicleType: "STANDARD" | "EV" | "SUV";
  status: "AVAILABLE" | "PENDING_PAYMENT" | "RESERVED" | "OCCUPIED";
}

export interface GarageSearchDto {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  ratePerHour: number;
  imageUrl: string;
  ownerId: string;
  spots: ParkingSpotDto[];
}

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1",
    prepareHeaders: async (headers) => {
      // Check if Clerk is active in window context
      if (typeof window !== "undefined" && (window as any).Clerk?.session) {
        try {
          const token = await (window as any).Clerk.session.getToken();
          if (token) {
            headers.set("Authorization", `Bearer ${token}`);
          }
        } catch (err) {
          console.error("Failed to retrieve Clerk token", err);
        }
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    createGarage: builder.mutation<any, GaragePayload>({
      query: (garageData) => ({
        url: "/garages",
        method: "POST",
        body: garageData,
      }),
    }),

    searchGarages: builder.query<GarageSearchDto[], { lat: number; lng: number; radius: number }>({
      query: ({ lat, lng, radius }) => ({
        url: `/garages/search?lat=${lat}&lng=${lng}&radius=${radius}`,
        method: "GET",
      }),
    }),
    reserveSpot: builder.mutation<any, { spotId: number }>({
      query: ({ spotId }) => ({
        url: `/spots/${spotId}/reserve`,
        method: "POST",
      }),
    }),
    confirmBooking: builder.mutation<any, { bookingId: number }>({
      query: ({ bookingId }) => ({
        url: `/bookings/${bookingId}/confirm`,
        method: "POST",
      }),
    }),
    getActiveBooking: builder.query<any, void>({
      query: () => ({
        url: "/bookings/active",
        method: "GET",
      }),
    }),
    createCheckoutSession: builder.mutation<any, { bookingId: number }>({
      query: ({ bookingId }) => ({
        url: `/payments/stripe/checkout-session?bookingId=${bookingId}`,
        method: "POST",
      }),
    }),
  }),
})

export const {
  useCreateGarageMutation,
  useSearchGaragesQuery,
  useReserveSpotMutation,
  useConfirmBookingMutation,
  useGetActiveBookingQuery,
  useCreateCheckoutSessionMutation
} = apiSlice
