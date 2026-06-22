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
  bookedUntil?: string;
  bookedBy?: string;
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

export interface BookingHistoryDto {
  id: number;
  driverId: string;
  garageId: number;
  garageName: string;
  garageAddress: string;
  spotId: number;
  spotNumber: string;
  baseAmount: number;
  status: "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED";
  startTime: string;
  endTime: string;
  createdAt: string;
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
    getGarageDetails: builder.query<GarageSearchDto, number>({
      query: (id) => ({
        url: `/garages/${id}`,
        method: "GET",
      }),
    }),
    updateGarage: builder.mutation<any, { id: number; body: GaragePayload }>({
      query: ({ id, body }) => ({
        url: `/garages/${id}`,
        method: "PUT",
        body,
      }),
    }),
    deleteGarage: builder.mutation<any, number>({
      query: (id) => ({
        url: `/garages/${id}`,
        method: "DELETE",
      }),
    }),

    searchGarages: builder.query<GarageSearchDto[], { lat: number; lng: number; radius: number; startTime?: string; endTime?: string }>({
      query: ({ lat, lng, radius, startTime, endTime }) => {
        let url = `/garages/search?lat=${lat}&lng=${lng}&radius=${radius}`;
        if (startTime) url += `&startTime=${encodeURIComponent(startTime)}`;
        if (endTime) url += `&endTime=${encodeURIComponent(endTime)}`;
        return {
          url,
          method: "GET",
        };
      },
    }),
    reserveSpot: builder.mutation<any, { spotId: number; startTime?: string; endTime?: string }>({
      query: ({ spotId, startTime, endTime }) => {
        let url = `/spots/${spotId}/reserve`;
        const params = [];
        if (startTime) params.push(`startTime=${encodeURIComponent(startTime)}`);
        if (endTime) params.push(`endTime=${encodeURIComponent(endTime)}`);
        if (params.length > 0) {
          url += `?${params.join("&")}`;
        }
        return {
          url,
          method: "POST",
        };
      },
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
    initiateEsewaPayment: builder.mutation<any, { bookingIds: string }>({
      query: ({ bookingIds }) => ({
        url: `/payments/esewa/initiate?bookingIds=${encodeURIComponent(bookingIds)}`,
        method: "POST",
      }),
    }),
    verifyEsewaPayment: builder.mutation<any, { data: string }>({
      query: (body) => ({
        url: `/payments/esewa/verify`,
        method: "POST",
        body,
      }),
    }),
    getBookingsHistory: builder.query<BookingHistoryDto[], void>({
      query: () => ({
        url: "/bookings",
        method: "GET",
      }),
    }),
    getOwnerAnalytics: builder.query<OwnerAnalyticsDto, void>({
      query: () => ({
        url: "/owner/analytics",
        method: "GET",
      }),
    }),
  }),
})

export interface GarageStatsDto {
  garageId: number;
  garageName: string;
  garageAddress: string;
  totalSpots: number;
  ratePerHour: number;
  earnings: number;
  bookingsCount: number;
}

export interface OwnerAnalyticsDto {
  totalGarages: number;
  totalEarnings: number;
  totalBookings: number;
  garageBreakdown: GarageStatsDto[];
  recentBookings: BookingHistoryDto[];
}

export const {
  useCreateGarageMutation,
  useGetGarageDetailsQuery,
  useUpdateGarageMutation,
  useDeleteGarageMutation,
  useSearchGaragesQuery,
  useReserveSpotMutation,
  useConfirmBookingMutation,
  useGetActiveBookingQuery,
  useInitiateEsewaPaymentMutation,
  useVerifyEsewaPaymentMutation,
  useGetBookingsHistoryQuery,
  useGetOwnerAnalyticsQuery
} = apiSlice

