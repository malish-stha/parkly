"use client"

import { useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { GarageSearchDto } from "@/store/apiSlice"

// Fix for default marker icon mapping in Leaflet with Webpack/Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
})

interface ParkingMapProps {
  center: { lat: number; lng: number };
  garages: GarageSearchDto[];
  selectedGarageId: number | null;
  onSelectGarage: (garage: GarageSearchDto) => void;
  onMapClick?: (lat: number, lng: number) => void;
}

// Helper component to center map on search coordinates change
function MapController({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap()
  useEffect(() => {
    map.setView([center.lat, center.lng], 14, { animate: true })
  }, [center, map])
  return null
}

// Component to handle map clicks
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}

export default function ParkingMap({ center, garages, selectedGarageId, onSelectGarage, onMapClick }: ParkingMapProps) {

  // Custom search center pin icon (sharp blue pin with white dot)
  const searchCenterIcon = L.divIcon({
    className: "search-center-pin",
    html: `
      <div style="
        width: 30px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(0 3px 5px rgba(0,0,0,0.3));
      ">
        <svg viewBox="0 0 384 512" width="30" height="40" xmlns="http://www.w3.org/2000/svg">
          <path fill="#3b82f6" stroke="#2563eb" stroke-width="12" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z"/>
          <circle cx="192" cy="192" r="60" fill="#ffffff"/>
        </svg>
      </div>
    `,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -40]
  })

  // Custom sharp green map pin representing parking garage
  const createOccupancyIcon = (openSpots: number, totalSpots: number, isSelected: boolean) => {
    const occupancyPercent = totalSpots > 0 ? (openSpots / totalSpots) * 100 : 0
    
    let color = "#10b981" // Emerald Green (Available)
    let border = "#ffffff"

    if (openSpots === 0) {
      color = "#ef4444" // Rose Red (Full)
    } else if (occupancyPercent < 50) {
      color = "#f59e0b" // Amber Yellow (Filling fast)
    }

    const hoverStyle = isSelected 
      ? "transform: scale(1.2); filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.6)) drop-shadow(0 4px 10px rgba(0,0,0,0.3)); border-color: #3b82f6;" 
      : "filter: drop-shadow(0 3px 6px rgba(0,0,0,0.25));"

    return L.divIcon({
      className: "custom-garage-pin",
      html: `
        <div style="
          position: relative;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: ${color};
          border: 2px solid ${border};
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 800;
          font-size: 15px;
          font-family: system-ui, -apple-system, sans-serif;
          ${hoverStyle}
          transition: all 0.2s ease;
          box-sizing: border-box;
        " class="hover:scale-110 select-none">
          G
          
          <!-- Numeric Availability Badge -->
          <div style="
            position: absolute;
            top: -5px;
            right: -5px;
            background-color: ${color};
            border: 1.5px solid #ffffff;
            border-radius: 9999px;
            min-width: 15px;
            height: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            color: #ffffff;
            font-weight: 800;
            font-family: system-ui, -apple-system, sans-serif;
            padding: 0 3px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            box-sizing: border-box;
          ">
            ${openSpots}
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16], // Anchored to center of circle
      popupAnchor: [0, -16]
    })
  }

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={14}
        style={{ width: "100%", height: "100%", zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController center={center} />
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

        {/* Render Search Center Marker */}
        <Marker position={[center.lat, center.lng]} icon={searchCenterIcon} zIndexOffset={1000}>
          <Popup className="custom-popup rounded-none">
            <div className="p-1 font-sans text-xs">
              <span className="font-semibold text-primary">Search Center Location</span>
            </div>
          </Popup>
        </Marker>

        {garages.map((garage) => {
          const totalSpots = garage.spots?.length || 0
          const openSpots = garage.spots?.filter(s => s.status === "AVAILABLE").length || 0
          const isSelected = selectedGarageId === garage.id

          return (
            <Marker
              key={garage.id}
              position={[garage.latitude, garage.longitude]}
              icon={createOccupancyIcon(openSpots, totalSpots, isSelected)}
              zIndexOffset={isSelected ? 500 : 10}
              eventHandlers={{
                click: () => onSelectGarage(garage)
              }}
            >
              <Popup className="custom-popup rounded-none">
                <div className="p-1 space-y-1 font-sans">
                  <h3 className="font-bold text-sm text-foreground">{garage.name}</h3>
                  <p className="text-xs text-muted-foreground">{garage.address}</p>
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-border mt-2">
                    <span className="font-semibold text-emerald-500">{garage.ratePerHour} NPR/hr</span>
                    <span className="text-muted-foreground">{openSpots} / {totalSpots} open</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
