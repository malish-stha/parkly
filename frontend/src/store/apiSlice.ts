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
    baseUrl: "http://localhost:8080/api/v1",
    prepareHeaders: (headers, { endpoint }) => {
      // Relay mock identities based on owner/driver roles until Clerk Auth is loaded
      if (!headers.has("X-User-Id")) {
        if (endpoint === "createGarage" || endpoint === "getOwnerGarages") {
          headers.set("X-User-Id", "user_mock_owner_123");
        } else {
          headers.set("X-User-Id", "user_mock_driver_123");
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
  }),
})

export const { 
  useCreateGarageMutation, 
  useSearchGaragesQuery,
  useReserveSpotMutation,
  useConfirmBookingMutation,
  useGetActiveBookingQuery
} = apiSlice
