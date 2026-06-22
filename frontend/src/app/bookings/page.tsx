"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth, UserButton } from "@clerk/nextjs"
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  CreditCard, 
  TrendingUp, 
  Clock, 
  Coins, 
  Car, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2 
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { useGetBookingsHistoryQuery, useInitiateEsewaPaymentMutation, BookingHistoryDto } from "@/store/apiSlice"

export default function BookingsHistoryPage() {
  const router = useRouter()
  const { isLoaded, userId } = useAuth()
  
  // Fetch user's bookings history
  const { data: bookings = [], isLoading, error, refetch } = useGetBookingsHistoryQuery(undefined, {
    skip: !isLoaded || !userId,
    refetchOnMountOrArgChange: true
  })

  const [initiateEsewaPayment, { isLoading: isRedirecting }] = useInitiateEsewaPaymentMutation()
  const [filterTab, setFilterTab] = useState<"ALL" | "ACTIVE" | "PAST" | "CANCELLED">("ALL")

  // Helper: check if a booking is currently active (confirmed/pending and not expired)
  const isBookingActive = (b: BookingHistoryDto) => {
    if (b.status === "CANCELLED") return false
    const end = new Date(b.endTime.endsWith('Z') ? b.endTime : b.endTime + 'Z').getTime()
    return end > Date.now()
  }

  // Calculate stats based on confirmed bookings
  const stats = useMemo(() => {
    let totalSpent = 0
    let confirmedCount = 0
    let activeCount = 0

    bookings.forEach((b) => {
      if (b.status === "CONFIRMED") {
        totalSpent += b.baseAmount
        confirmedCount++
      }
      if (isBookingActive(b)) {
        activeCount++
      }
    })

    return { totalSpent, confirmedCount, activeCount }
  }, [bookings])

  // Filter list based on selected tab
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (filterTab === "ACTIVE") return isBookingActive(b)
      if (filterTab === "PAST") return b.status === "CONFIRMED" && !isBookingActive(b)
      if (filterTab === "CANCELLED") return b.status === "CANCELLED"
      return true
    })
  }, [bookings, filterTab])

  // Handle direct payment for pending bookings
  const handlePayNow = async (bookingId: number) => {
    try {
      const esewaPayload = await initiateEsewaPayment({ bookingIds: String(bookingId) }).unwrap()
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
      console.error("Direct payment initiation failed", err)
    }
  }

  const formatDatetime = (dtStr: string) => {
    try {
      const d = new Date(dtStr.endsWith('Z') ? dtStr : dtStr + 'Z')
      return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    } catch (e) {
      return dtStr
    }
  }

  if (!isLoaded || isLoading) {
    return (
      <div className="w-full h-screen bg-background flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 border-4 border-primary border-t-transparent animate-spin text-primary" />
        <span className="text-sm text-muted-foreground font-semibold">Loading Bookings History...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Redirect Loading Overlay */}
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
              onClick={() => router.push("/search")}
              className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-xl font-bold tracking-tight text-foreground">My Bookings</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 space-y-8">
        
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Total Spent */}
          <div className="bg-slate-50/80 dark:bg-white/2 backdrop-blur-xl border border-slate-200 dark:border-white/8 p-6 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Spent</span>
              <h3 className="text-2xl font-black text-emerald-500">{stats.totalSpent} NPR</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Coins className="h-6 w-6" />
            </div>
          </div>

          {/* Card 2: Completed Bookings */}
          <div className="bg-slate-50/80 dark:bg-white/2 backdrop-blur-xl border border-slate-200 dark:border-white/8 p-6 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Reservations</span>
              <h3 className="text-2xl font-black text-foreground">{stats.confirmedCount} Spots</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>

          {/* Card 3: Active Slots */}
          <div className="bg-slate-50/80 dark:bg-white/2 backdrop-blur-xl border border-slate-200 dark:border-white/8 p-6 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Active Bookings</span>
              <h3 className="text-2xl font-black text-primary">{stats.activeCount} Active</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Clock className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-border text-sm font-semibold gap-6 pb-px">
          {(["ALL", "ACTIVE", "PAST", "CANCELLED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`pb-3 border-b-2 hover:text-foreground transition-colors cursor-pointer capitalize text-xs tracking-wider font-bold ${
                filterTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              {tab.toLowerCase()}
            </button>
          ))}
        </div>

        {/* List of Bookings */}
        {filteredBookings.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl space-y-3">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto" />
            <h4 className="font-bold text-foreground">No bookings found</h4>
            <p className="text-xs text-muted-foreground">
              You do not have any reservations under the "{filterTab.toLowerCase()}" filter.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((b) => {
              const active = isBookingActive(b)
              let statusLabel = b.status as string
              let statusStyle = "bg-slate-500/10 text-slate-500 border-slate-500/20"
              let statusIcon = <Clock className="h-3.5 w-3.5" />

              if (b.status === "CONFIRMED") {
                if (active) {
                  statusLabel = "Active"
                  statusStyle = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  statusIcon = <CheckCircle2 className="h-3.5 w-3.5" />
                } else {
                  statusLabel = "Completed"
                  statusStyle = "bg-blue-500/10 text-blue-600 border-blue-500/20"
                  statusIcon = <CheckCircle2 className="h-3.5 w-3.5" />
                }
              } else if (b.status === "PENDING_PAYMENT") {
                statusLabel = "Pending Payment"
                statusStyle = "bg-amber-500/10 text-amber-600 border-amber-500/20"
                statusIcon = <AlertCircle className="h-3.5 w-3.5" />
              } else if (b.status === "CANCELLED") {
                statusLabel = "Cancelled"
                statusStyle = "bg-rose-500/10 text-rose-500 border-rose-500/20"
                statusIcon = <XCircle className="h-3.5 w-3.5" />
              }

              return (
                <div 
                  key={b.id}
                  className="bg-card/40 backdrop-blur-md border border-border p-6 rounded-2xl flex flex-col md:flex-row justify-between gap-6"
                >
                  <div className="flex gap-4">
                    {/* Visual Icon */}
                    <div className="w-12 h-12 bg-muted border border-border rounded-xl flex items-center justify-center shrink-0">
                      <Car className="h-6 w-6 text-muted-foreground" />
                    </div>

                    {/* Details */}
                    <div className="space-y-2">
                      <div>
                        <h4 className="font-bold text-foreground text-sm">{b.garageName}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3 text-primary/70 shrink-0" />
                          <span className="truncate max-w-xs md:max-w-md">{b.garageAddress}</span>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-muted-foreground pt-1.5 border-t border-border/40">
                        <div className="flex items-center gap-2">
                          <span className="font-bold uppercase tracking-wider text-[9px] text-muted-foreground/60 w-10">Start:</span>
                          <span>{formatDatetime(b.startTime)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold uppercase tracking-wider text-[9px] text-muted-foreground/60 w-10">End:</span>
                          <span>{formatDatetime(b.endTime)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div className="flex flex-row md:flex-col justify-between items-center md:items-end gap-3 shrink-0">
                    <div className="flex flex-col md:items-end gap-1.5">
                      <span className="text-xs font-semibold text-muted-foreground">Spot {b.spotNumber}</span>
                      <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 border rounded-full ${statusStyle}`}>
                        {statusIcon}
                        <span className="capitalize">{statusLabel.toLowerCase()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Amount</span>
                        <span className="text-sm font-black text-emerald-500">{b.baseAmount} NPR</span>
                      </div>
                      
                      {/* Direct Pay Action for pending checkout */}
                      {b.status === "PENDING_PAYMENT" && (
                        <button
                          onClick={() => handlePayNow(b.id)}
                          className="h-9 px-4 flex items-center justify-center gap-1.5 bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors cursor-pointer rounded-full text-xs"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>Pay Now</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
