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
    prepareHeaders: (headers) => {
      // Relay mock identity until Clerk Auth is loaded
      headers.set("X-User-Id", "user_mock_owner_123")
      return headers
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
  }),
})

export const { useCreateGarageMutation, useSearchGaragesQuery } = apiSlice
