"use client"

import { useState, useMemo } from "react"
import { useSelector } from "react-redux"
import { RootState } from "@/store/store"
import { X, Car, Zap, Truck, Bike, Banknote, MapPin, Landmark, ArrowRight, Loader2 } from "lucide-react"
import { GarageSearchDto, ParkingSpotDto, useReserveSpotMutation } from "@/store/apiSlice"
import { useAuth } from "@clerk/nextjs"

interface SpotSelectorProps {
  garage: GarageSearchDto;
  onClose: () => void;
  onReserve: (resData: { spotId: number; expiresAt: string; bookingId: number; garageId: number }) => void;
  onPay: (bookingId: number) => void;
  startTime?: string;
  endTime?: string;
}

export default function SpotSelector({
  garage,
  onClose,
  onReserve,
  onPay,
  startTime,
  endTime
}: SpotSelectorProps) {
  const { userId } = useAuth()
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpotDto | null>(null)
  const activeReservations = useSelector((state: RootState) => state.booking.activeReservations)
  const [reservedInfo, setReservedInfo] = useState<{ bookingId: number; expiresAt: string; spotId: number; garageId: number } | null>(null)
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

  const currentSpot = useMemo(() => {
    if (!selectedSpot) return null
    return garage.spots.find(s => s.id === selectedSpot.id) || selectedSpot
  }, [garage.spots, selectedSpot])

  const isCurrentSpotAvailable = useMemo(() => {
    return currentSpot?.status === "AVAILABLE"
  }, [currentSpot])

  const isReservedByMe = useMemo(() => {
    if (!currentSpot) return false
    const isReservedInRedux = activeReservations.some(r => r.spotId === String(currentSpot.id))
    const isReservedInDb = !!(currentSpot.bookedBy && userId && currentSpot.bookedBy === userId)
    return isReservedInRedux || isReservedInDb
  }, [currentSpot, activeReservations, userId])

  const handleReserveClick = async () => {
    if (!selectedSpot) return
    try {
      const res = await reserveSpot({
        spotId: selectedSpot.id,
        startTime,
        endTime
      }).unwrap()

      const info = {
        spotId: Number(res.spotId),
        expiresAt: res.expiresAt,
        bookingId: Number(res.bookingId) || Date.now(),
        garageId: Number(res.garageId)
      }
      setReservedInfo(info)
      onReserve(info)
    } catch (err) {
      console.error("Failed to reserve spot", err)
    }
  }

  const handlePayClick = () => {
    if (!currentSpot) return
    const activeRes = activeReservations.find(r => r.spotId === String(currentSpot.id))
    const bookingId = reservedInfo?.bookingId || (activeRes ? Number(activeRes.bookingId) : null)
    if (!bookingId) return
    onPay(bookingId)
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
            <Banknote className="h-3.5 w-3.5 text-emerald-500" />
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
              <span className="w-3.5 h-3.5 bg-emerald-500/10 border border-emerald-500 inline-flex items-center justify-center">
                <Zap className="h-2.5 w-2.5" />
              </span>
              <span>Available EV</span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-500">
              <span className="w-3.5 h-3.5 bg-blue-500/10 border border-blue-500 inline-flex items-center justify-center">
                <Truck className="h-2.5 w-2.5" />
              </span>
              <span>Available SUV</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-500">
              <span className="w-3.5 h-3.5 bg-amber-500/10 border border-amber-500 inline-flex items-center justify-center">
                <Bike className="h-2.5 w-2.5" />
              </span>
              <span>Available Bike</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground/60">
              <span className="w-3.5 h-3.5 bg-muted-foreground/10 border border-muted-foreground/20 text-muted-foreground/30 inline-flex items-center justify-center select-none text-[8px] leading-none">
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
                    const isCurrentlyReservedByThisDriver = activeReservations.some(r => r.spotId === String(spot.id)) || !!(spot.bookedBy && userId && spot.bookedBy === userId)

                    let spotStyles = ""
                    let icon = <Car className="h-3.5 w-3.5" />

                    if (isAvailable) {
                      if (spot.vehicleType === "EV") {
                        spotStyles = "bg-emerald-500/5 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600 hover:border-emerald-500 cursor-pointer"
                        icon = <Zap className="h-3.5 w-3.5" />
                      } else if (spot.vehicleType === "SUV") {
                        spotStyles = "bg-blue-500/5 border-blue-500/30 hover:bg-blue-500/10 text-blue-600 hover:border-blue-500 cursor-pointer"
                        icon = <Truck className="h-3.5 w-3.5" />
                      } else if (spot.vehicleType === "BIKE") {
                        spotStyles = "bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10 text-amber-600 hover:border-amber-500 cursor-pointer"
                        icon = <Bike className="h-3.5 w-3.5" />
                      } else {
                        spotStyles = "bg-card border-border hover:bg-muted/80 text-foreground hover:border-foreground/40 cursor-pointer"
                        icon = <Car className="h-3.5 w-3.5" />
                      }

                      if (isSpotSelected) {
                        spotStyles = "bg-primary/10 border-primary text-primary hover:bg-primary/15 cursor-pointer shadow-[0_0_0_2px_var(--primary)]"
                      }
                    } else {
                      if (isCurrentlyReservedByThisDriver) {
                        spotStyles = "bg-primary/10 border-primary text-primary hover:bg-primary/15 cursor-pointer font-black shadow-[0_0_0_2px_var(--primary)]"
                        if (spot.vehicleType === "BIKE") {
                          icon = <Bike className="h-3.5 w-3.5 text-primary" />
                        } else if (spot.vehicleType === "EV") {
                          icon = <Zap className="h-3.5 w-3.5 text-primary" />
                        } else if (spot.vehicleType === "SUV") {
                          icon = <Truck className="h-3.5 w-3.5 text-primary" />
                        } else {
                          icon = <Car className="h-3.5 w-3.5 text-primary" />
                        }
                      } else {
                        spotStyles = "bg-muted-foreground/5 border-border text-muted-foreground/30 opacity-30 select-none cursor-pointer"
                        if (spot.vehicleType === "BIKE") {
                          icon = <Bike className="h-3.5 w-3.5 opacity-20" />
                        } else if (spot.vehicleType === "EV") {
                          icon = <Zap className="h-3.5 w-3.5 opacity-20" />
                        } else if (spot.vehicleType === "SUV") {
                          icon = <Truck className="h-3.5 w-3.5 opacity-20" />
                        } else {
                          icon = <Car className="h-3.5 w-3.5 opacity-20" />
                        }
                        if (isSpotSelected) {
                          spotStyles = "bg-muted-foreground/10 border-primary text-muted-foreground/40 cursor-pointer shadow-[0_0_0_2px_var(--primary)]"
                        }
                      }
                    }

                    const tooltipText = isCurrentlyReservedByThisDriver
                      ? (spot.status === "PENDING_PAYMENT" ? `Reserved by you (Pending payment)` : `Booked by you`)
                      : (!isAvailable && spot.bookedUntil
                        ? `Booked until ${new Date(spot.bookedUntil.endsWith('Z') ? spot.bookedUntil : spot.bookedUntil + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : undefined);

                    return (
                      <button
                        key={spot.id}
                        type="button"
                        onClick={() => {
                          setSelectedSpot(spot)
                          setReservedInfo(null)
                        }}
                        title={tooltipText}
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
        {currentSpot && !isCurrentSpotAvailable && !isReservedByMe && (
          <div className="border border-amber-500/30 bg-amber-500/5 p-3 text-xs font-semibold text-amber-600 text-center rounded-none animate-in fade-in duration-200">
            ⚠️ Spot {currentSpot.spotNumber} is booked until{" "}
            <span className="font-bold text-amber-700">
              {currentSpot.bookedUntil
                ? new Date(currentSpot.bookedUntil.endsWith('Z') ? currentSpot.bookedUntil : currentSpot.bookedUntil + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : "the end of the slot"}
            </span>.
          </div>
        )}

        {currentSpot && isReservedByMe && currentSpot.status !== "PENDING_PAYMENT" && !reservedInfo && (
          <div className="border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs font-semibold text-emerald-600 text-center rounded-none animate-in fade-in duration-200">
            🎉 You have a confirmed booking for Spot {currentSpot.spotNumber}!
          </div>
        )}

        {(reservedInfo || (isReservedByMe && currentSpot?.status === "PENDING_PAYMENT")) && (
          <div className="border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs font-semibold text-emerald-600 text-center rounded-none animate-in fade-in duration-200">
            ✅ Spot {currentSpot?.spotNumber} successfully reserved until{" "}
            <span className="font-bold text-emerald-700">
              {(() => {
                const activeRes = activeReservations.find(r => r.spotId === String(currentSpot?.id));
                const exp = reservedInfo?.expiresAt || activeRes?.expiresAt || "";
                return new Date(exp.endsWith('Z') ? exp : `${exp}Z`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              })()}
            </span>! Please complete the payment within the time limit.
          </div>
        )}

        {reserveError && (
          <div className="border border-destructive bg-destructive/10 p-3 text-xs font-semibold text-destructive text-center rounded-none">
            {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
            {/* @ts-ignore */}
            {reserveError?.data?.message || "Failed to reserve spot. Please try again."}
          </div>
        )}

        {currentSpot && isReservedByMe && currentSpot.status !== "PENDING_PAYMENT" && !reservedInfo ? (
          <button
            type="button"
            disabled
            className="w-full h-11 flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold opacity-80 cursor-not-allowed rounded-none text-sm"
          >
            <span>Booking Confirmed</span>
          </button>
        ) : !(reservedInfo || (isReservedByMe && currentSpot?.status === "PENDING_PAYMENT")) ? (
          <button
            type="button"
            disabled={!currentSpot || !isCurrentSpotAvailable || isReserving}
            onClick={handleReserveClick}
            className="w-full h-11 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer rounded-none text-sm"
          >
            {isReserving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Reserving Spot...</span>
              </>
            ) : (
              <>
                <span>Confirm Reservation {currentSpot ? `- Spot ${currentSpot.spotNumber}` : ""}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        ) : (
          <div className="space-y-3 animate-in zoom-in-95 duration-200">
            <div className="bg-amber-500/5 border border-amber-500/20 p-2.5 text-[10px] text-amber-800 dark:text-amber-300 rounded-none leading-relaxed">
              <span className="font-extrabold uppercase block tracking-wider mb-1">eSewa Test Credentials:</span>
              <div>• <strong className="font-mono">eSewa ID/Mobile:</strong> 9806800003 or 9806800002</div>
              <div>• <strong className="font-mono">MPIN/Password:</strong> Nepal@123</div>
              <div>• <strong className="font-mono">OTP Code:</strong> 123456</div>
            </div>
            <button
              type="button"
              onClick={handlePayClick}
              className="w-full h-11 flex items-center justify-center gap-2 bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors cursor-pointer rounded-none text-sm"
            >
              <span>Proceed to eSewa Payment</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
