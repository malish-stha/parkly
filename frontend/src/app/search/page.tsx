"use client"

import { useState, useMemo, useEffect, useRef, Suspense } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Clock, CreditCard, Loader2, CheckCircle, Sparkles, Crown } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import SearchSidebar from "@/components/driver/search-sidebar"
import SpotSelector from "@/components/driver/spot-selector"
import AIAssistant from "@/components/driver/ai-assistant"
import { useSearchGaragesQuery, GarageSearchDto, useInitiateEsewaPaymentMutation, useVerifyEsewaPaymentMutation, useGetActiveBookingQuery, useGetSubscriptionStatusQuery } from "@/store/apiSlice"
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
  const activeReservations = useSelector((state: RootState) => state.booking.activeReservations)

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
  const [filterVehicle, setFilterVehicle] = useState<"STANDARD" | "EV" | "SUV" | "BIKE" | "ALL">("ALL")
  const [sortBy, setSortBy] = useState<"PRICE" | "DISTANCE" | "SPOTS">("DISTANCE")
  const [selectedGarageId, setSelectedGarageId] = useState<number | null>(null)
  const [isAiOpen, setIsAiOpen] = useState(false)
  const [aiSelectedGarage, setAiSelectedGarage] = useState<GarageSearchDto | null>(null)

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
  const { data: subStatus } = useGetSubscriptionStatusQuery(undefined, {
    skip: !isLoaded || !userId,
  })
  const [initiateEsewaPayment, { isLoading: isRedirecting }] = useInitiateEsewaPaymentMutation()
  const [verifyEsewaPayment, { isLoading: isVerifying }] = useVerifyEsewaPaymentMutation()
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  // Keep track of the active reservation state to detect the transition from active to null (expired/cleared)
  const wasActiveRef = useRef(false)

  // 1. Initial Page Load / Query response Active Reservation Restore & Sync
  useEffect(() => {
    if (Array.isArray(activeBookingDb)) {
      const dbPendingBookingIds = activeBookingDb
        .filter(b => b.status === "PENDING_PAYMENT")
        .map(b => String(b.id));

      activeBookingDb.forEach(b => {
        if (b.status === "PENDING_PAYMENT" && !paymentSuccess) {
          const dbBookingId = String(b.id);
          const createdTime = new Date(b.createdAt.endsWith('Z') ? b.createdAt : b.createdAt + 'Z').getTime();
          const expiresTime = b.expiresAt
            ? new Date(b.expiresAt.endsWith('Z') ? b.expiresAt : b.expiresAt + 'Z').getTime()
            : createdTime + 10 * 60 * 1000;
          const now = new Date().getTime();
          if (expiresTime - now <= 2000) {
            return;
          }

          const existing = activeReservations.find(r => r.bookingId === dbBookingId);
          if (!existing || existing.bookingId.startsWith("temp-")) {
            dispatch(
              setReservation({
                bookingId: dbBookingId,
                spotId: String(b.spotId),
                garageId: String(b.garageId),
                expiresAt: new Date(expiresTime).toISOString()
              })
            )
          }
        }
      });

      // Clean up reservations that are confirmed or no longer active.
      // Guard: If the reservation was just created (has > 595 seconds remaining),
      // we bypass clearing it to allow the activeBookingDb query time to resolve and catch up.
      activeReservations.forEach(r => {
        if (!dbPendingBookingIds.includes(r.bookingId)) {
          const maxHoldSeconds = subStatus?.type === "DRIVER_GOLD" ? 1800 : 600;
          if (r.secondsRemaining > (maxHoldSeconds - 5)) {
            return;
          }
          dispatch(clearReservation(r.bookingId));
        }
      });
    }
  }, [activeBookingDb, activeReservations, paymentSuccess, dispatch])

  // 2. Timer Countdown Tick hook
  useEffect(() => {
    if (activeReservations.length === 0) return

    const interval = setInterval(() => {
      dispatch(tickTimer())
    }, 1000)

    return () => clearInterval(interval)
  }, [activeReservations.length, dispatch])

  // 3. Poll active booking if we currently only have a temporary reservation ID (waiting for Kafka propagation)
  useEffect(() => {
    const hasTemp = activeReservations.some(r => r.bookingId.startsWith("temp-"))
    if (!hasTemp) return

    const interval = setInterval(() => {
      refetchActiveBooking()
    }, 2000)

    return () => clearInterval(interval)
  }, [activeReservations, refetchActiveBooking])

  // 4. Trigger list and map updates when spots release or confirm
  useEffect(() => {
    if (activeReservations.length > 0) {
      wasActiveRef.current = true
    } else if (wasActiveRef.current) {
      // Reservation transitioned from active to null (expired or cleared)
      wasActiveRef.current = false
      refetchGarages()
      refetchActiveBooking()
    }
  }, [activeReservations.length, refetchGarages, refetchActiveBooking])

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
    return processedGarages.find((g) => g.id === selectedGarageId) || aiSelectedGarage || null
  }, [processedGarages, selectedGarageId, aiSelectedGarage])

  const handleSelectGarage = (garage: GarageSearchDto) => {
    setSelectedGarageId(garage.id)
    setAiSelectedGarage(null)
  }

  const handleAiNavigate = (garage: GarageSearchDto) => {
    setAiSelectedGarage(garage)
    setSelectedGarageId(garage.id)
    setIsAiOpen(false)
  }

  const handleConfirmPayment = async (customBookingIds?: string) => {
    const targetBookingIds = customBookingIds || activeReservations.map(r => r.bookingId).join(",")
    if (!targetBookingIds || targetBookingIds.startsWith("temp-")) return
    try {
      const esewaPayload = await initiateEsewaPayment({ bookingIds: targetBookingIds }).unwrap()
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
            <Link
              href="/bookings"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors cursor-pointer mr-2"
            >
              My Bookings
            </Link>
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

      {activeReservations.length > 0 && (
        (() => {
          // Find earliest expiration reservation (minimum secondsRemaining)
          const sorted = [...activeReservations].sort((a, b) => a.secondsRemaining - b.secondsRemaining);
          const earliestRes = sorted[0];

          // Get comma-separated list of booking IDs
          const allBookingIds = activeReservations.map(r => r.bookingId).join(",");

          // Resolve spot numbers
          const spotNumbers = activeReservations.map(r => {
            for (const g of rawGarages) {
              const match = g.spots?.find(s => String(s.id) === r.spotId);
              if (match) return match.spotNumber;
            }
            return `#${r.spotId}`;
          }).join(", ");

          // Calculate total base amount by matching booking records
          const totalAmount = activeBookingDb && Array.isArray(activeBookingDb)
            ? activeBookingDb
              .filter(b => b.status === "PENDING_PAYMENT" && activeReservations.some(r => r.bookingId === String(b.id)))
              .reduce((sum, b) => sum + b.baseAmount, 0)
            : activeReservations.length * 10; // fallback if db is loading

          return (
            <div className="backdrop-blur-md bg-amber-500/10 dark:bg-amber-500/10 border-b border-amber-500/20 dark:border-amber-500/30 px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold text-amber-800 dark:text-amber-200 shrink-0 animate-in slide-in-from-top duration-300 rounded-none shadow-[inset_0_1px_0_0_rgba(251,191,36,0.1)]">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500/30 opacity-75"></span>
                  <Clock className="h-3.5 w-3.5 relative" />
                </div>
                <div className="text-amber-900 dark:text-amber-300 text-[11px] font-semibold space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>
                      Pending Reservations: Spots <span className="font-mono bg-amber-500/20 dark:bg-amber-500/30 text-amber-950 dark:text-amber-200 px-1.5 py-0.5 rounded font-black">{spotNumbers}</span> are held. Must pay before <span className="font-extrabold text-amber-950 dark:text-amber-100">{new Date(earliestRes.expiresAt.endsWith('Z') ? earliestRes.expiresAt : earliestRes.expiresAt + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>.
                    </span>
                    <span className="text-amber-500/30 font-light">|</span>
                    <span>
                      Total: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{totalAmount} NPR</span>
                    </span>
                    <span className="text-amber-500/30 font-light">|</span>
                    <span className="flex items-center gap-1">
                      Time remaining:{" "}
                      <span className="font-mono bg-amber-500 text-white dark:bg-amber-600 dark:text-white px-1.5 py-0.5 rounded text-[10px] font-black tracking-wider shadow-sm inline-block animate-pulse">
                        {Math.floor(earliestRes.secondsRemaining / 60)}:
                        {String(earliestRes.secondsRemaining % 60).padStart(2, "0")}
                      </span>
                    </span>
                    {subStatus?.type === "DRIVER_GOLD" && (
                      <>
                        <span className="text-amber-500/30 font-light">|</span>
                        <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full select-none uppercase tracking-wide">
                          <Crown className="w-3 h-3 text-amber-500 shrink-0" /> Gold 10% Discount Applied
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-[10px] text-amber-800/80 dark:text-amber-400/80 font-normal">
                    <span className="font-bold">Test Credentials:</span> eSewa ID: <code className="bg-amber-500/20 dark:bg-amber-500/30 px-1 py-0.5 rounded font-mono text-[9px]">9806800003</code> | MPIN: <code className="bg-amber-500/20 dark:bg-amber-500/30 px-1 py-0.5 rounded font-mono text-[9px]">Nepal@123</code> | OTP: <code className="bg-amber-500/20 dark:bg-amber-500/30 px-1 py-0.5 rounded font-mono text-[9px]">123456</code>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleConfirmPayment(allBookingIds)}
                disabled={isRedirecting}
                className="self-start sm:self-center h-8 px-4 flex items-center justify-center bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold transition-all duration-200 cursor-pointer rounded-full text-[10px] uppercase tracking-wider shadow-md shadow-amber-500/20 hover:shadow-amber-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 shrink-0"
              >
                {isRedirecting ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Pay {totalAmount} NPR with eSewa</span>
                )}
              </button>
            </div>
          );
        })()
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <SearchSidebar
          garages={processedGarages}
          loading={isLoading}
          onLocationSelected={(lat, lng) => {
            setCenter({ lat, lng })
            setSelectedGarageId(null)
            setAiSelectedGarage(null)
          }}
          radius={radius}
          onRadiusChange={(val) => {
            setRadius(val)
            setSelectedGarageId(null)
            setAiSelectedGarage(null)
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
            radius={radius}
            garages={processedGarages}
            selectedGarageId={selectedGarageId}
            onSelectGarage={handleSelectGarage}
            onMapClick={(lat, lng) => {
              setCenter({ lat, lng })
              setSelectedGarageId(null)
              setAiSelectedGarage(null)
            }}
          />

          {/* AI Search Assistant Trigger Button */}
          {!isAiOpen && (
            <button
              onClick={() => setIsAiOpen(true)}
              className="absolute bottom-6 right-6 z-[10] group flex items-center gap-2 px-5 py-3.5 bg-background/80 hover:bg-primary/95 text-foreground hover:text-primary-foreground backdrop-blur-md border border-border/80 shadow-lg hover:shadow-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer rounded-full"
            >
              <Sparkles className="h-4 w-4 text-primary group-hover:text-primary-foreground animate-pulse" />
              <span>AI Spot Finder</span>
            </button>
          )}
        </div>

        {/* Spot Selector Slide-over Drawer */}
        {selectedGarage && (
          <SpotSelector
            garage={selectedGarage}
            onClose={() => {
              setSelectedGarageId(null)
              setAiSelectedGarage(null)
            }}
            startTime={startTimeUtc}
            endTime={endTimeUtc}
            onReserve={(res) => {
              // Store reservation details in Redux
              dispatch(
                setReservation({
                  bookingId: String(res.bookingId),
                  spotId: String(res.spotId),
                  garageId: String(res.garageId),
                  expiresAt: res.expiresAt
                })
              )
              refetchGarages()
              refetchActiveBooking()
            }}
            onPay={async (bookingId) => {
              // Close drawers and proceed to checkout redirect
              setSelectedGarageId(null)
              setAiSelectedGarage(null)
              await handleConfirmPayment(String(bookingId))
            }}
          />
        )}

        {/* AI Assistant Chat Drawer */}
        {isAiOpen && (
          <AIAssistant
            onClose={() => setIsAiOpen(false)}
            onNavigateToGarage={handleAiNavigate}
            center={center}
            onCenterChange={(lat, lng) => setCenter({ lat, lng })}
          />
        )}
      </div>
    </div>
  )
}
