"use client"

import { useState, useEffect } from "react"
import { Search, Landmark, MapPin } from "lucide-react"
import { GarageSearchDto } from "@/store/apiSlice"

interface SearchSidebarProps {
  garages: GarageSearchDto[];
  loading: boolean;
  onLocationSelected: (lat: number, lng: number) => void;
  radius: number;
  onRadiusChange: (val: number) => void;
  selectedGarageId: number | null;
  onSelectGarage: (garage: GarageSearchDto) => void;
  filterVehicle: "STANDARD" | "EV" | "SUV" | "ALL";
  onFilterVehicleChange: (val: "STANDARD" | "EV" | "SUV" | "ALL") => void;
  sortBy: "PRICE" | "DISTANCE" | "SPOTS";
  onSortByChange: (val: "PRICE" | "DISTANCE" | "SPOTS") => void;
}

export default function SearchSidebar({
  garages,
  loading,
  onLocationSelected,
  radius,
  onRadiusChange,
  selectedGarageId,
  onSelectGarage,
  filterVehicle,
  onFilterVehicleChange,
  sortBy,
  onSortByChange
}: SearchSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)

  // Autocomplete Suggestions Fetching
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(searchQuery)}`
        )
        const data = await response.json()
        setSuggestions(data.map((item: any) => ({
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        })))
      } catch (err) {
        console.error("Autocomplete failed", err)
      }
    }, 450) // 450ms debounce

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setShowDropdown(false)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(searchQuery)}`
      )
      const data = await response.json()
      if (data && data[0]) {
        const lat = parseFloat(data[0].lat)
        const lng = parseFloat(data[0].lon)
        onLocationSelected(lat, lng)
      }
    } catch (err) {
      console.error("Geocoding failed", err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSuggestionClick = (sug: any) => {
    setSearchQuery(sug.display_name)
    setSuggestions([])
    setShowDropdown(false)
    onLocationSelected(sug.lat, sug.lng)
  }

  return (
    <div className="w-full md:w-96 h-full border-r border-border bg-card/90 backdrop-blur-md flex flex-col z-10">
      {/* Search Header */}
      <div className="p-6 border-b border-border space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Find Parking</h2>
          <p className="text-xs text-muted-foreground">Search and filter live spots in Nepal</p>
        </div>

        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            placeholder="Search address (e.g. Kathmandu)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowDropdown(true)
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            className="w-full h-10 pl-10 pr-4 border border-border bg-card text-foreground focus:outline-none focus:border-primary text-sm rounded-none"
          />
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          {isSearching && (
            <div className="absolute right-3 top-3.5 w-3 h-3 border-2 border-primary border-t-transparent animate-spin"></div>
          )}

          {/* Autocomplete Suggestions Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 bg-card border border-border shadow-lg max-h-60 overflow-y-auto rounded-none mt-1">
              {suggestions.map((sug, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSuggestionClick(sug)}
                  className="px-4 py-2.5 text-xs text-foreground hover:bg-muted/50 cursor-pointer border-b last:border-0 border-border/40 truncate select-none text-left"
                  title={sug.display_name}
                >
                  {sug.display_name}
                </div>
              ))}
            </div>
          )}
        </form>
      </div>

      {/* Filter and Config panel */}
      <div className="p-6 border-b border-border space-y-5">
        {/* Radius Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-muted-foreground uppercase tracking-wider">Search Radius</span>
            <span className="text-primary font-bold">{radius.toFixed(1)} km</span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            step={0.5}
            value={radius}
            onChange={(e) => onRadiusChange(parseFloat(e.target.value))}
            className="w-full accent-primary bg-muted h-1 cursor-pointer appearance-none outline-none"
          />
        </div>

        {/* Vehicle Filter Tabs */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Required Type</span>
          <div className="grid grid-cols-4 gap-1.5 bg-muted p-1 border border-border">
            {(["ALL", "STANDARD", "EV", "SUV"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onFilterVehicleChange(type)}
                className={`py-1.5 text-[10px] font-bold tracking-tight text-center cursor-pointer transition-all rounded-none uppercase ${
                  filterVehicle === type
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Sorting Dropdown/Tabs */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sort By</span>
          <div className="grid grid-cols-3 gap-1.5 border border-border bg-muted p-1">
            {(["PRICE", "DISTANCE", "SPOTS"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onSortByChange(opt)}
                className={`py-1.5 text-[10px] font-bold tracking-tight text-center cursor-pointer transition-all rounded-none ${
                  sortBy === opt
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent animate-spin"></div>
            <span className="text-xs text-muted-foreground">Searching nearby spots...</span>
          </div>
        ) : garages.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <MapPin className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">No Garages Found</p>
            <p className="text-xs text-muted-foreground">
              Try increasing search radius or searching another area.
            </p>
          </div>
        ) : (
          garages.map((garage) => {
            const total = garage.spots?.length || 0
            const open = garage.spots?.filter((s) => s.status === "AVAILABLE").length || 0
            const isSelected = selectedGarageId === garage.id

            return (
              <div
                key={garage.id}
                onClick={() => onSelectGarage(garage)}
                className={`p-4 border border-border cursor-pointer transition-all flex gap-4 rounded-none ${
                  isSelected
                    ? "bg-primary/5 border-primary"
                    : "bg-card hover:bg-muted/30"
                }`}
              >
                {/* Visual Thumbnail */}
                <div className="w-20 h-20 bg-muted shrink-0 overflow-hidden relative border border-border rounded-none">
                  {garage.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={garage.imageUrl}
                      alt={garage.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Landmark className="h-8 w-8 text-muted-foreground absolute inset-0 m-auto" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1.5 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-foreground truncate">{garage.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{garage.address}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                    <span className="font-semibold text-emerald-500">{garage.ratePerHour} NPR/hr</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 border rounded-none ${
                        open === 0
                          ? "bg-rose-500/10 border-rose-500 text-rose-500"
                          : open / total < 0.5
                          ? "bg-amber-500/10 border-amber-500 text-amber-500"
                          : "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                      }`}
                    >
                      {open} / {total} free
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
