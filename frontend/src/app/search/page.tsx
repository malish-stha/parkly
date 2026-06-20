"use client"

import { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import SearchSidebar from "@/components/driver/search-sidebar"
import { useSearchGaragesQuery, GarageSearchDto } from "@/store/apiSlice"

// Dynamically import Leaflet map with SSR disabled
const ParkingMap = dynamic(() => import("@/components/driver/parking-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-muted/20 flex flex-col items-center justify-center space-y-3">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent animate-spin"></div>
      <span className="text-sm text-muted-foreground font-semibold">Initializing Interactive Map...</span>
    </div>
  ),
})

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371 // Radius of earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function SearchPage() {
  const router = useRouter()
  
  // Search state
  const [center, setCenter] = useState({ lat: 27.7172, lng: 85.3240 }) // Default Kathmandu center
  const [radius, setRadius] = useState(5.0) // 5km search radius
  
  // Filters & Sorting state
  const [filterVehicle, setFilterVehicle] = useState<"STANDARD" | "EV" | "SUV" | "ALL">("ALL")
  const [sortBy, setSortBy] = useState<"PRICE" | "DISTANCE" | "SPOTS">("DISTANCE")
  const [selectedGarageId, setSelectedGarageId] = useState<number | null>(null)

  // Fetch garages nearby based on search center and radius
  const { data: rawGarages = [], isLoading } = useSearchGaragesQuery({
    lat: center.lat,
    lng: center.lng,
    radius,
  })

  // Filter and sort garages client-side
  const processedGarages = useMemo(() => {
    let result = [...rawGarages]

    // 1. Filter by vehicle type support
    if (filterVehicle !== "ALL") {
      result = result.filter((g) =>
        g.spots.some((s) => s.vehicleType === filterVehicle)
      )
    }

    // 2. Sort by selected options
    result.sort((a, b) => {
      if (sortBy === "PRICE") {
        return a.ratePerHour - b.ratePerHour
      }
      if (sortBy === "DISTANCE") {
        const distA = calculateDistance(center.lat, center.lng, a.latitude, a.longitude)
        const distB = calculateDistance(center.lat, center.lng, b.latitude, b.longitude)
        return distA - distB
      }
      if (sortBy === "SPOTS") {
        const spotsA = a.spots.filter((s) => s.status === "AVAILABLE").length
        const spotsB = b.spots.filter((s) => s.status === "AVAILABLE").length
        return spotsB - spotsA // Descending order of open spots
      }
      return 0
    })

    return result
  }, [rawGarages, filterVehicle, sortBy, center])

  const handleSelectGarage = (garage: GarageSearchDto) => {
    setSelectedGarageId(garage.id)
    setCenter({ lat: garage.latitude, lng: garage.longitude })
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground transition-colors duration-300 overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md shrink-0">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-xl font-bold tracking-tight text-foreground">Driver Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <SearchSidebar
          garages={processedGarages}
          loading={isLoading}
          onLocationSelected={(lat, lng) => {
            setCenter({ lat, lng })
            setSelectedGarageId(null)
          }}
          radius={radius}
          onRadiusChange={(val) => {
            setRadius(val)
            setSelectedGarageId(null)
          }}
          selectedGarageId={selectedGarageId}
          onSelectGarage={handleSelectGarage}
          filterVehicle={filterVehicle}
          onFilterVehicleChange={(val) => setFilterVehicle(val)}
          sortBy={sortBy}
          onSortByChange={(val) => setSortBy(val)}
        />

        {/* Map Canvas */}
        <div className="flex-1 h-full relative z-0">
          <ParkingMap
            center={center}
            garages={processedGarages}
            selectedGarageId={selectedGarageId}
            onSelectGarage={handleSelectGarage}
            onMapClick={(lat, lng) => {
              setCenter({ lat, lng })
              setSelectedGarageId(null)
            }}
          />
        </div>
      </div>
    </div>
  )
}
