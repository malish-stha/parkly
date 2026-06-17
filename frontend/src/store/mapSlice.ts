import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Coordinates {
  lat: number;
  lng: number;
}

interface GarageInfo {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  ratePerHour: number;
  imageUrl?: string;
  openSpotsCount: number;
  totalSpotsCount: number;
}

interface RouteInfo {
  start: Coordinates;
  end: Coordinates;
  distanceKm?: number;
  durationMins?: number;
}

interface MapState {
  searchCenter: Coordinates;
  selectedGarage: GarageInfo | null;
  garagesList: GarageInfo[];
  activeRoute: RouteInfo | null;
  filterVehicleType: 'STANDARD' | 'EV' | 'SUV' | 'ALL';
  sortBy: 'PRICE_LOW' | 'DISTANCE_CLOSE' | 'SPOTS_HIGH';
}

const initialState: MapState = {
  searchCenter: { lat: 27.7172, lng: 85.3240 }, // Default Kathmandu, Nepal Center
  selectedGarage: null,
  garagesList: [],
  activeRoute: null,
  filterVehicleType: 'ALL',
  sortBy: 'DISTANCE_CLOSE',
};

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    setSearchCenter: (state, action: PayloadAction<Coordinates>) => {
      state.searchCenter = action.payload;
    },
    setSelectedGarage: (state, action: PayloadAction<GarageInfo | null>) => {
      state.selectedGarage = action.payload;
    },
    setGaragesList: (state, action: PayloadAction<GarageInfo[]>) => {
      state.garagesList = action.payload;
    },
    setActiveRoute: (state, action: PayloadAction<RouteInfo | null>) => {
      state.activeRoute = action.payload;
    },
    setFilterVehicleType: (state, action: PayloadAction<MapState['filterVehicleType']>) => {
      state.filterVehicleType = action.payload;
    },
    setSortBy: (state, action: PayloadAction<MapState['sortBy']>) => {
      state.sortBy = action.payload;
    },
  },
});

export const {
  setSearchCenter,
  setSelectedGarage,
  setGaragesList,
  setActiveRoute,
  setFilterVehicleType,
  setSortBy,
} = mapSlice.actions;

export default mapSlice.reducer;
