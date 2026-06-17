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
  }),
})

export const { useCreateGarageMutation } = apiSlice
