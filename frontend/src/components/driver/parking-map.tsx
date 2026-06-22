"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { GarageSearchDto } from "@/store/apiSlice"
import { Navigation } from "lucide-react"

// Fix for default marker icon mapping in Leaflet with Webpack/Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
})

interface ParkingMapProps {
  center: { lat: number; lng: number };
  radius: number;
  garages: GarageSearchDto[];
  selectedGarageId: number | null;
  onSelectGarage: (garage: GarageSearchDto) => void;
  onMapClick?: (lat: number, lng: number) => void;
}

// Helper component to center map and fit search bounds based on radius
function MapController({ center, radius, isGarageSelected }: { center: { lat: number; lng: number }; radius: number; isGarageSelected: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (isGarageSelected) return

    const latChange = radius / 111.0
    const cosLat = Math.cos((center.lat * Math.PI) / 180)
    const lngChange = cosLat > 0 ? radius / (111.0 * cosLat) : 0

    const bounds = L.latLngBounds(
      [center.lat - latChange, center.lng - lngChange],
      [center.lat + latChange, center.lng + lngChange]
    )
    map.fitBounds(bounds, { padding: [40, 40], animate: true })
  }, [center, radius, isGarageSelected, map])
  return null
}

// Helper component to auto fit bounds when garage is selected
function MapBoundsController({ center, selectedGarage }: { center: { lat: number; lng: number }; selectedGarage: GarageSearchDto | null }) {
  const map = useMap()
  useEffect(() => {
    if (selectedGarage) {
      const bounds = L.latLngBounds(
        [center.lat, center.lng],
        [selectedGarage.latitude, selectedGarage.longitude]
      )
      map.fitBounds(bounds, { padding: [100, 100], maxZoom: 16, animate: true })
    }
  }, [center, selectedGarage, map])
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

export default function ParkingMap({ center, radius, garages, selectedGarageId, onSelectGarage, onMapClick }: ParkingMapProps) {
  const [routePositions, setRoutePositions] = useState<[number, number][]>([])
  const [routeMeta, setRouteMeta] = useState<{ distance: string; duration: string } | null>(null)

  // Fetch OSRM driving route when search center or selected garage changes
  useEffect(() => {
    const selectedGarage = garages.find((g) => g.id === selectedGarageId)
    if (!selectedGarage) {
      setRoutePositions([])
      setRouteMeta(null)
      return
    }

    let active = true

    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${center.lng},${center.lat};${selectedGarage.longitude},${selectedGarage.latitude}?overview=full&geometries=geojson`
        const res = await fetch(url)
        if (!res.ok) throw new Error("OSRM fetch failed")
        const data = await res.json()
        
        if (active && data.routes && data.routes.length > 0) {
          const route = data.routes[0]
          const coords = route.geometry.coordinates
          const positions = coords.map((c: [number, number]) => [c[1], c[0]] as [number, number])
          
          setRoutePositions(positions)
          setRouteMeta({
            distance: (route.distance / 1000).toFixed(1) + " km",
            duration: Math.round(route.duration / 60) + " mins",
          })
        }
      } catch (err) {
        console.error("OSRM Routing error:", err)
      }
    }

    fetchRoute()

    return () => {
      active = false
    }
  }, [center, selectedGarageId, garages])

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
        <MapController center={center} radius={radius} isGarageSelected={selectedGarageId !== null} />
        <MapBoundsController center={center} selectedGarage={garages.find(g => g.id === selectedGarageId) || null} />
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

        {/* Render Search Radius Circle */}
        <Circle
          center={[center.lat, center.lng]}
          radius={radius * 1000}
          pathOptions={{
            color: "#3b82f6",
            fillColor: "#3b82f6",
            fillOpacity: 0.08,
            weight: 1.5,
            dashArray: "5 5"
          }}
        />

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
        {routePositions.length > 0 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: "#3b82f6",
              weight: 5,
              opacity: 0.8,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}
      </MapContainer>

      {routeMeta && (
        <div className="absolute top-4 left-4 z-[10] bg-background/85 backdrop-blur-md border border-border p-3 shadow-lg rounded-none max-w-[280px] animate-in slide-in-from-left duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary">
              <Navigation className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">Proximity driving route</span>
              <span className="text-xs font-black text-foreground">
                {routeMeta.distance} • {routeMeta.duration} drive
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
