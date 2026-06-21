"use client"

import { useState, useMemo, useEffect, useRef, Suspense } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Clock, CreditCard, Loader2, CheckCircle } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import SearchSidebar from "@/components/driver/search-sidebar"
import SpotSelector from "@/components/driver/spot-selector"
import { useSearchGaragesQuery, GarageSearchDto, useInitiateEsewaPaymentMutation, useVerifyEsewaPaymentMutation, useGetActiveBookingQuery } from "@/store/apiSlice"
import { UserButton, useAuth } from "@clerk/nextjs"
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

function getLocalDatetimeString(date: Date) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen bg-background flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent animate-spin"></div>
        <span className="text-sm text-muted-foreground font-semibold">Loading Driver Dashboard...</span>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  )
}

function SearchPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const esewaData = searchParams.get("data")
  const dispatch = useDispatch()

  // Redux booking state selectors
  const activeReservation = useSelector((state: RootState) => state.booking.activeReservation)
  
  // Search state
  const [center, setCenter] = useState({ lat: 27.7172, lng: 85.3240 }) // Default Kathmandu center
  const [radius, setRadius] = useState(5.0) // 5km search radius
  
  // Booking start/end time range state (local time inputs)
  const [startTimeLocal, setStartTimeLocal] = useState(() => {
    const now = new Date()
    return getLocalDatetimeString(now)
  })
  const [endTimeLocal, setEndTimeLocal] = useState(() => {
    const nextHour = new Date()
    nextHour.setHours(nextHour.getHours() + 1)
    return getLocalDatetimeString(nextHour)
  })

  // Convert to UTC ISO format for backend queries
  const startTimeUtc = useMemo(() => {
    if (!startTimeLocal) return ""
    try {
      return new Date(startTimeLocal).toISOString()
    } catch (e) {
      return ""
    }
  }, [startTimeLocal])

  const endTimeUtc = useMemo(() => {
    if (!endTimeLocal) return ""
    try {
      return new Date(endTimeLocal).toISOString()
    } catch (e) {
      return ""
    }
  }, [endTimeLocal])
  
  // Filters & Sorting state
  const [filterVehicle, setFilterVehicle] = useState<"STANDARD" | "EV" | "SUV" | "ALL">("ALL")
  const [sortBy, setSortBy] = useState<"PRICE" | "DISTANCE" | "SPOTS">("DISTANCE")
  const [selectedGarageId, setSelectedGarageId] = useState<number | null>(null)

  // Fetch garages nearby based on search center and radius
  const { data: rawGarages = [], isLoading, refetch: refetchGarages } = useSearchGaragesQuery({
    lat: center.lat,
    lng: center.lng,
    radius,
    startTime: startTimeUtc,
    endTime: endTimeUtc,
  })
  // Clerk authentication state
  const { userId, isLoaded } = useAuth()

  // Queries & Mutations for active reservation and confirmations
  const { data: activeBookingDb, refetch: refetchActiveBooking } = useGetActiveBookingQuery(undefined, {
    skip: !isLoaded || !userId,
    refetchOnMountOrArgChange: true
  })
  const [initiateEsewaPayment, { isLoading: isRedirecting }] = useInitiateEsewaPaymentMutation()
  const [verifyEsewaPayment, { isLoading: isVerifying }] = useVerifyEsewaPaymentMutation()
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  // Keep track of the active reservation state to detect the transition from active to null (expired/cleared)
  const wasActiveRef = useRef(false)

  // 1. Initial Page Load / Query response Active Reservation Restore & Sync
  useEffect(() => {
    if (activeBookingDb) {
      if (activeBookingDb.status === "PENDING_PAYMENT" && !paymentSuccess) {
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
      } else if (activeBookingDb.status === "CONFIRMED") {
        // If DB has confirmed the booking, clear any stale frontend reservation banners
        if (activeReservation) {
          dispatch(clearReservation())
        }
      }
    }
  }, [activeBookingDb, activeReservation, paymentSuccess, dispatch])

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

  // 5. eSewa Payment Callback Verification
  const hasVerifiedRef = useRef(false)
  useEffect(() => {
    if (esewaData && isLoaded && userId && !hasVerifiedRef.current) {
      hasVerifiedRef.current = true
      verifyEsewaPayment({ data: esewaData })
        .unwrap()
        .then(() => {
          setPaymentSuccess(true)
          dispatch(clearReservation())
          refetchActiveBooking()
          refetchGarages()
          // Clean up URL query params
          router.replace("/search")
        })
        .catch((err) => {
          console.error("eSewa verification failed", err)
          router.replace("/search")
        })
    }
  }, [esewaData, isLoaded, userId, verifyEsewaPayment, dispatch, refetchActiveBooking, refetchGarages, router])

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
      const esewaPayload = await initiateEsewaPayment({ bookingId: Number(activeReservation.bookingId) }).unwrap()
      if (esewaPayload && esewaPayload.esewa_url) {
        // Dynamically create and submit POST form to eSewa endpoint
        const form = document.createElement("form")
        form.method = "POST"
        form.action = esewaPayload.esewa_url

        Object.entries(esewaPayload).forEach(([key, val]) => {
          if (key !== "esewa_url") {
            const hiddenField = document.createElement("input")
            hiddenField.type = "hidden"
            hiddenField.name = key
            hiddenField.value = String(val)
            form.appendChild(hiddenField)
          }
        })

        document.body.appendChild(form)
        form.submit()
      }
    } catch (err) {
      console.error("eSewa payment initiation failed", err)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground transition-colors duration-300 overflow-hidden">
      {/* Full-screen Loading Overlay during eSewa Redirect */}
      {isRedirecting && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 animate-in fade-in duration-200">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm font-semibold text-foreground">Redirecting to eSewa...</span>
        </div>
      )}
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
            <UserButton />
          </div>
        </div>
      </header>



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
          startTime={startTimeLocal}
          onStartTimeChange={setStartTimeLocal}
          endTime={endTimeLocal}
          onEndTimeChange={setEndTimeLocal}
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
            startTime={startTimeUtc}
            endTime={endTimeUtc}
            onReserve={async (res) => {
              // Close the spot selector drawer
              setSelectedGarageId(null)
              
              // Store reservation details in Redux using the actual bookingId
              dispatch(
                setReservation({
                  bookingId: String(res.bookingId),
                  spotId: String(res.spotId),
                  garageId: String(res.garageId),
                  expiresAt: res.expiresAt
                })
              )
              refetchGarages()

              // Immediately initiate eSewa payment and redirect
              try {
                const esewaPayload = await initiateEsewaPayment({ bookingId: Number(res.bookingId) }).unwrap()
                if (esewaPayload && esewaPayload.esewa_url) {
                  const form = document.createElement("form")
                  form.method = "POST"
                  form.action = esewaPayload.esewa_url

                  Object.entries(esewaPayload).forEach(([key, val]) => {
                    if (key !== "esewa_url") {
                      const hiddenField = document.createElement("input")
                      hiddenField.type = "hidden"
                      hiddenField.name = key
                      hiddenField.value = String(val)
                      form.appendChild(hiddenField)
                    }
                  })

                  document.body.appendChild(form)
                  form.submit()
                }
              } catch (err) {
                console.error("eSewa payment initiation failed", err)
              }
            }}
          />
        )}
      </div>
    </div>
  )
}
