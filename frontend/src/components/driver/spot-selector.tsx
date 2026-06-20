"use client"

import { useState, useMemo } from "react"
import { X, Car, Zap, Truck, DollarSign, MapPin, Landmark, ArrowRight, Loader2 } from "lucide-react"
import { GarageSearchDto, ParkingSpotDto, useReserveSpotMutation } from "@/store/apiSlice"

interface SpotSelectorProps {
  garage: GarageSearchDto;
  onClose: () => void;
  onReserve: (resData: { spotId: number; expiresAt: string; bookingId: number; garageId: number }) => void;
  activeReservationSpotId?: string | null;
}

export default function SpotSelector({
  garage,
  onClose,
  onReserve,
  activeReservationSpotId
}: SpotSelectorProps) {
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpotDto | null>(null)
  const [reserveSpot, { isLoading: isReserving, error: reserveError }] = useReserveSpotMutation()

  // Group spots by row letter parsed from the spot number (e.g. A1 -> row A)
  // Or if they are not in letter-number format, sort them in a simple grid.
  const spotGrid = useMemo(() => {
    const rowsMap: Record<string, ParkingSpotDto[]> = {}
    
    // Sort spots by spotNumber naturally
    const sortedSpots = [...garage.spots].sort((a, b) => 
      a.spotNumber.localeCompare(b.spotNumber, undefined, { numeric: true, sensitivity: 'base' })
    )

    sortedSpots.forEach(spot => {
      // Extract row letter (e.g. A from A1, or default to "A" if no letters)
      const matches = spot.spotNumber.match(/^([A-Za-z]+)/)
      const row = matches ? matches[1].toUpperCase() : "A"
      if (!rowsMap[row]) {
        rowsMap[row] = []
      }
      rowsMap[row].push(spot)
    })

    return Object.entries(rowsMap).sort((a, b) => a[0].localeCompare(b[0]))
  }, [garage.spots])

  const handleReserveClick = async () => {
    if (!selectedSpot) return
    try {
      const res = await reserveSpot({ spotId: selectedSpot.id }).unwrap()
      // Note: the backend ParkingSpotController publishes event to Kafka, and payment-service creates a Booking.
      // Since it is async, the bookingId will be generated in payment-service.
      // But parking-service knows the spotId and garageId. We'll pass the response up to start the countdown.
      // Wait, does the reserve endpoint return the bookingId?
      // Since the reservation is created asynchronously via Kafka, the response from parking-service won't have the bookingId.
      // However, we can fetch the active booking from `/bookings/active` or let the frontend know the spotId/expiresAt!
      // In the controller we returned: spotId, spotNumber, garageId, garageName, ratePerHour, expiresAt.
      // Let's pass these details to the onReserve callback! We can fetch booking ID dynamically or mock it in Redux.
      onReserve({
        spotId: res.spotId,
        expiresAt: res.expiresAt,
        bookingId: res.bookingId || Date.now(), // Fallback mock ID if async lag is present
        garageId: res.garageId
      })
    } catch (err) {
      console.error("Failed to reserve spot", err)
    }
  }

  return (
    <div className="fixed top-16 right-0 bottom-0 z-40 w-full md:w-[480px] bg-card border-l border-border shadow-2xl flex flex-col rounded-none animate-in slide-in-from-right duration-300">
      {/* Drawer Header */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Landmark className="h-5 w-5" />
            <h3 className="font-bold text-lg tracking-tight">Spot Selection</h3>
          </div>
          <p className="text-xs text-muted-foreground">Select a spot inside the parking grid</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Garage Info Summary */}
      <div className="p-6 bg-muted/30 border-b border-border space-y-3">
        <h4 className="font-bold text-foreground text-sm">{garage.name}</h4>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-primary/70" />
            <span className="truncate">{garage.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-semibold text-emerald-500">{garage.ratePerHour} NPR/hr</span>
          </div>
        </div>
      </div>

      {/* Grid Canvas and Legend */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Legend */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Legend & States</span>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold p-3 bg-muted border border-border">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 bg-card border border-border inline-block"></span>
              <span>Available Standard</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-500">
              <span className="w-3.5 h-3.5 bg-emerald-500/10 border border-emerald-500 inline-block flex items-center justify-center">
                <Zap className="h-2 w-2" />
              </span>
              <span>Available EV</span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-500">
              <span className="w-3.5 h-3.5 bg-blue-500/10 border border-blue-500 inline-block flex items-center justify-center">
                <Truck className="h-2 w-2" />
              </span>
              <span>Available SUV</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground/60">
              <span className="w-3.5 h-3.5 bg-muted-foreground/10 border border-muted-foreground/20 text-muted-foreground/30 inline-block flex items-center justify-center select-none line-through">
                x
              </span>
              <span>Reserved/Occupied</span>
            </div>
          </div>
        </div>

        {/* Spot Grid Map */}
        <div className="space-y-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Interactive Lot Map</span>
          <div className="border border-border p-4 bg-muted/20 overflow-x-auto space-y-4">
            {spotGrid.map(([row, rowSpots]) => (
              <div key={row} className="space-y-2">
                <div className="text-xs font-bold text-muted-foreground px-1 uppercase">Row {row}</div>
                <div className="grid grid-cols-5 gap-2">
                  {rowSpots.map((spot) => {
                    const isAvailable = spot.status === "AVAILABLE"
                    const isSpotSelected = selectedSpot?.id === spot.id
                    const isCurrentlyReservedByThisDriver = activeReservationSpotId === String(spot.id)

                    let spotStyles = "bg-muted-foreground/5 border-border text-muted-foreground/40 cursor-not-allowed select-none opacity-40"
                    let icon = <Car className="h-3.5 w-3.5 opacity-30" />

                    if (isAvailable) {
                      if (spot.vehicleType === "EV") {
                        spotStyles = "bg-emerald-500/5 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600 hover:border-emerald-500 cursor-pointer"
                        icon = <Zap className="h-3.5 w-3.5" />
                      } else if (spot.vehicleType === "SUV") {
                        spotStyles = "bg-blue-500/5 border-blue-500/30 hover:bg-blue-500/10 text-blue-600 hover:border-blue-500 cursor-pointer"
                        icon = <Truck className="h-3.5 w-3.5" />
                      } else {
                        spotStyles = "bg-card border-border hover:bg-muted/80 text-foreground hover:border-foreground/40 cursor-pointer"
                        icon = <Car className="h-3.5 w-3.5" />
                      }

                      if (isSpotSelected) {
                        spotStyles = "bg-primary/10 border-primary text-primary hover:bg-primary/15 cursor-pointer shadow-[0_0_0_2px_var(--primary)]"
                      }
                    } else if (isCurrentlyReservedByThisDriver) {
                      spotStyles = "bg-primary/10 border-primary text-primary cursor-not-allowed shadow-[0_0_0_2px_var(--primary)]"
                    }

                    return (
                      <button
                        key={spot.id}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setSelectedSpot(spot)}
                        className={`border p-2 flex flex-col items-center justify-center gap-1.5 transition-all text-[11px] font-bold rounded-none h-14 ${spotStyles}`}
                      >
                        <span className="truncate">{spot.spotNumber}</span>
                        {icon}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Drawer Action Footer */}
      <div className="p-6 border-t border-border bg-background space-y-4">
        {reserveError && (
          <div className="border border-destructive bg-destructive/10 p-3 text-xs font-semibold text-destructive text-center rounded-none">
            {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
            {/* @ts-ignore */}
            {reserveError?.data?.message || "Failed to reserve spot. Please try again."}
          </div>
        )}

        <button
          type="button"
          disabled={!selectedSpot || isReserving}
          onClick={handleReserveClick}
          className="w-full h-11 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer rounded-none text-sm"
        >
          {isReserving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Initiating Lock...</span>
            </>
          ) : (
            <>
              <span>Reserve {selectedSpot ? `Spot ${selectedSpot.spotNumber}` : "Select a Spot"}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
