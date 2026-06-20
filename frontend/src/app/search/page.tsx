"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clock, CreditCard, Loader2, CheckCircle } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import SearchSidebar from "@/components/driver/search-sidebar"
import SpotSelector from "@/components/driver/spot-selector"
import { useSearchGaragesQuery, GarageSearchDto, useConfirmBookingMutation, useGetActiveBookingQuery } from "@/store/apiSlice"
import { useDispatch, useSelector } from "react-redux"
import { RootState } from "@/store/store"
import { setReservation, clearReservation, tickTimer } from "@/store/bookingSlice"

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
  const dispatch = useDispatch()

  // Redux booking state selectors
  const activeReservation = useSelector((state: RootState) => state.booking.activeReservation)
  
  // Search state
  const [center, setCenter] = useState({ lat: 27.7172, lng: 85.3240 }) // Default Kathmandu center
  const [radius, setRadius] = useState(5.0) // 5km search radius
  
  // Filters & Sorting state
  const [filterVehicle, setFilterVehicle] = useState<"STANDARD" | "EV" | "SUV" | "ALL">("ALL")
  const [sortBy, setSortBy] = useState<"PRICE" | "DISTANCE" | "SPOTS">("DISTANCE")
  const [selectedGarageId, setSelectedGarageId] = useState<number | null>(null)

  // Fetch garages nearby based on search center and radius
  const { data: rawGarages = [], isLoading, refetch: refetchGarages } = useSearchGaragesQuery({
    lat: center.lat,
    lng: center.lng,
    radius,
  })

  // Queries & Mutations for active reservation and confirmations
  const { data: activeBookingDb, refetch: refetchActiveBooking } = useGetActiveBookingQuery(undefined, {
    refetchOnMountOrArgChange: true
  })
  const [confirmBooking, { isLoading: isConfirming }] = useConfirmBookingMutation()
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  // Keep track of the active reservation state to detect the transition from active to null (expired/cleared)
  const wasActiveRef = useRef(false)

  // 1. Initial Page Load / Query response Active Reservation Restore & Sync
  useEffect(() => {
    if (activeBookingDb && activeBookingDb.status === "PENDING_PAYMENT") {
      const dbBookingId = String(activeBookingDb.id);
      
      // Guard: Do not restore if the expiration time is already in the past relative to the browser clock,
      // or if it is on the verge of expiring (within 2 seconds) to prevent restoration loops.
      const expiresTime = new Date(activeBookingDb.endTime.endsWith('Z') ? activeBookingDb.endTime : activeBookingDb.endTime + 'Z').getTime();
      const now = new Date().getTime();
      if (expiresTime - now <= 2000) {
        return;
      }
      
      // Restore or sync booking ID once Kafka processes the request
      if (
        !activeReservation || 
        activeReservation.bookingId.startsWith("temp-") || 
        activeReservation.bookingId !== dbBookingId
      ) {
        dispatch(
          setReservation({
            bookingId: dbBookingId,
            spotId: String(activeBookingDb.spotId),
            garageId: String(activeBookingDb.garageId),
            expiresAt: activeBookingDb.endTime
          })
        )
      }
    }
  }, [activeBookingDb, activeReservation, dispatch])

  // 2. Timer Countdown Tick hook
  useEffect(() => {
    if (!activeReservation) return

    const interval = setInterval(() => {
      dispatch(tickTimer())
    }, 1000)

    return () => clearInterval(interval)
  }, [activeReservation, dispatch])

  // 3. Poll active booking if we currently only have a temporary reservation ID (waiting for Kafka propagation)
  useEffect(() => {
    if (!activeReservation || !activeReservation.bookingId.startsWith("temp-")) return

    const interval = setInterval(() => {
      refetchActiveBooking()
    }, 2000)

    return () => clearInterval(interval)
  }, [activeReservation, refetchActiveBooking])

  // 4. Trigger list and map updates when spots release or confirm
  useEffect(() => {
    if (activeReservation) {
      wasActiveRef.current = true
    } else if (wasActiveRef.current) {
      // Reservation transitioned from active to null (expired or cleared)
      wasActiveRef.current = false
      refetchGarages()
      refetchActiveBooking()
    }
  }, [activeReservation, refetchGarages, refetchActiveBooking])

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

  const selectedGarage = useMemo(() => {
    return processedGarages.find((g) => g.id === selectedGarageId) || null
  }, [processedGarages, selectedGarageId])

  const handleSelectGarage = (garage: GarageSearchDto) => {
    setSelectedGarageId(garage.id)
    setCenter({ lat: garage.latitude, lng: garage.longitude })
  }

  const handleConfirmPayment = async () => {
    if (!activeReservation || activeReservation.bookingId.startsWith("temp-")) return
    try {
      await confirmBooking({ bookingId: Number(activeReservation.bookingId) }).unwrap()
      setPaymentSuccess(true)
      dispatch(clearReservation())
      refetchGarages()
      refetchActiveBooking()
      
      // Auto-clear confirmation banner after 6 seconds
      setTimeout(() => {
        setPaymentSuccess(false)
      }, 6000)
    } catch (err) {
      console.error("Payment confirmation failed", err)
    }
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

      {/* Reservation Active / Confirmed Banner */}
      {activeReservation && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold rounded-none shrink-0 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 text-amber-600">
            <Clock className="h-4 w-4 animate-pulse shrink-0" />
            <span>
              Reservation Locked! You have{" "}
              <span className="font-bold text-amber-700">
                {Math.floor(activeReservation.secondsRemaining / 60)}:
                {String(activeReservation.secondsRemaining % 60).padStart(2, "0")}
              </span>{" "}
              minutes remaining to pay and secure your spot.
            </span>
          </div>
          <button
            onClick={handleConfirmPayment}
            disabled={isConfirming || activeReservation.bookingId.startsWith("temp-")}
            className="h-8 px-4 flex items-center justify-center gap-2 bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors disabled:opacity-50 cursor-pointer rounded-none text-xs text-center"
          >
            {isConfirming || activeReservation.bookingId.startsWith("temp-") ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CreditCard className="h-3.5 w-3.5" />
            )}
            <span>Pay & Confirm (Mock)</span>
          </button>
        </div>
      )}

      {paymentSuccess && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-6 py-3 flex items-center gap-2 text-xs font-semibold text-emerald-600 shrink-0 animate-in fade-in duration-300 rounded-none">
          <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>Payment Secure! Your booking is confirmed and spot is reserved.</span>
        </div>
      )}

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

        {/* Spot Selector Slide-over Drawer */}
        {selectedGarage && (
          <SpotSelector
            garage={selectedGarage}
            activeReservationSpotId={activeReservation?.spotId}
            onClose={() => setSelectedGarageId(null)}
            onReserve={(res) => {
              // Store temporary booking ID to start ticking immediately
              dispatch(
                setReservation({
                  bookingId: "temp-" + Date.now(),
                  spotId: String(res.spotId),
                  garageId: String(res.garageId),
                  expiresAt: res.expiresAt
                })
              )
              refetchGarages()
              
              // Trigger active reservation query refetch after 500ms to allow Kafka processing
              setTimeout(() => {
                refetchActiveBooking()
              }, 500)
            }}
          />
        )}
      </div>
    </div>
  )
}
