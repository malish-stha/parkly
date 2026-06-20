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
  
  // Custom search center pin icon (sharp blue marker)
  const searchCenterIcon = L.divIcon({
    className: "search-center-pin",
    html: `
      <div style="
        background-color: rgba(59, 130, 246, 0.15);
        border: 2px solid #3b82f6;
        color: #3b82f6;
        font-weight: 800;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
      " class="rounded-none select-none">
        <div style="width: 8px; height: 8px; background-color: #3b82f6;" class="rounded-none"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  })

  // Custom sharp rectangular DivIcon creator reflecting occupancy fraction
  const createOccupancyIcon = (openSpots: number, totalSpots: number, isSelected: boolean) => {
    const occupancyPercent = totalSpots > 0 ? (openSpots / totalSpots) * 100 : 0
    
    let color = "#10b981" // Emerald Green
    let bg = "rgba(16, 185, 129, 0.1)"
    let border = "#10b981"

    if (openSpots === 0) {
      color = "#ef4444" // Rose Red
      bg = "rgba(239, 68, 68, 0.1)"
      border = "#ef4444"
    } else if (occupancyPercent < 50) {
      color = "#f59e0b" // Amber Yellow
      bg = "rgba(245, 158, 11, 0.1)"
      border = "#f59e0b"
    }

    const shadow = isSelected ? "box-shadow: 0 0 0 3px var(--primary), 0 4px 12px rgba(0,0,0,0.25);" : "box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);"

    return L.divIcon({
      className: "custom-sharp-pin",
      html: `
        <div style="
          background-color: ${bg};
          border: 2px solid ${border};
          color: ${color};
          font-weight: 800;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          ${shadow}
          transition: all 0.2s ease;
        " class="hover:scale-105 select-none rounded-none">
          ${openSpots}/${totalSpots}
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
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
        <Marker position={[center.lat, center.lng]}>
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
