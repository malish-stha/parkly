"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth, UserButton } from "@clerk/nextjs"
import { 
  ArrowLeft, 
  Landmark, 
  TrendingUp, 
  Coins, 
  Clock, 
  Loader2, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Building2, 
  ArrowUpRight 
} from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { useGetOwnerAnalyticsQuery, useDeleteGarageMutation, BookingHistoryDto, GarageStatsDto } from "@/store/apiSlice"

export default function OwnerAnalyticsPage() {
  const router = useRouter()
  const { isLoaded, userId } = useAuth()
  
  // Fetch owner analytics
  const { data: analytics, isLoading, error, refetch, isFetching } = useGetOwnerAnalyticsQuery(undefined, {
    skip: !isLoaded || !userId,
    refetchOnMountOrArgChange: true
  })

  const [deleteGarage, { isLoading: isDeleting }] = useDeleteGarageMutation()

  const handleDeleteClick = async (garageId: number, garageName: string) => {
    if (window.confirm(`Are you sure you want to delete the garage "${garageName}"? This action cannot be undone.`)) {
      try {
        await deleteGarage(garageId).unwrap()
        refetch()
      } catch (err: any) {
        console.error("Failed to delete garage", err)
        alert(err?.data?.message || err?.message || "Failed to delete garage.")
      }
    }
  }

  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; label: string; value: number } | null>(null)

  // Group confirmed bookings by day for the trend chart
  const recentBookings = analytics?.recentBookings ?? []
  const revenueTrend = useMemo(() => {
    const map: Record<string, number> = {}
    
    // Sort recent bookings oldest to newest
    const confirmedBookings = [...recentBookings]
      .filter(b => b.status === "CONFIRMED")
      .reverse();

    // Default to last 7 days dynamically
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' })
      map[dateStr] = 0
    }
    
    // Add actual booking values
    confirmedBookings.forEach((b) => {
      try {
        const d = new Date(b.createdAt.endsWith('Z') ? b.createdAt : b.createdAt + 'Z')
        const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' })
        if (dateStr in map) {
          map[dateStr] += b.baseAmount
        }
      } catch (e) {}
    })

    return Object.entries(map).map(([label, value]) => ({ label, value }))
  }, [recentBookings])

  const svgMetrics = useMemo(() => {
    if (revenueTrend.length === 0) return { pathD: "", areaD: "", points: [], maxVal: 100 }
    const maxVal = Math.max(...revenueTrend.map(t => t.value), 100)
    
    const width = 500
    const height = 200
    const paddingLeft = 50
    const paddingRight = 30
    const paddingTop = 20
    const paddingBottom = 40
    
    const chartWidth = width - paddingLeft - paddingRight
    const chartHeight = height - paddingTop - paddingBottom
    
    const points = revenueTrend.map((item, index) => {
      const x = paddingLeft + (index / (revenueTrend.length - 1)) * chartWidth
      const y = height - paddingBottom - (item.value / maxVal) * chartHeight
      return { x, y, label: item.label, value: item.value }
    })
    
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const areaD = points.length > 0 
      ? `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`
      : ""
      
    return { pathD, areaD, points, maxVal }
  }, [revenueTrend])

  const formatDatetime = (dtStr: string) => {
    try {
      const d = new Date(dtStr.endsWith('Z') ? dtStr : dtStr + 'Z')
      return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    } catch (e) {
      return dtStr
    }
  }

  const isBookingActive = (b: BookingHistoryDto) => {
    if (b.status === "CANCELLED") return false
    const end = new Date(b.endTime.endsWith('Z') ? b.endTime : b.endTime + 'Z').getTime()
    return end > Date.now()
  }

  if (!isLoaded || isLoading) {
    return (
      <div className="w-full h-screen bg-background flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 border-4 border-primary border-t-transparent animate-spin text-primary" />
        <span className="text-sm text-muted-foreground font-semibold">Loading Analytics Dashboard...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-screen bg-background flex flex-col items-center justify-center space-y-4 px-6 text-center">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h3 className="text-xl font-bold text-foreground">Failed to load analytics</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Something went wrong while retrieving your garage stats. Please check your network connection or try again.
        </p>
        <button 
          onClick={() => refetch()}
          className="h-10 px-5 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity cursor-pointer text-sm"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Retry</span>
        </button>
      </div>
    )
  }

  // Handle default state if no response
  const totalGarages = analytics?.totalGarages ?? 0
  const totalEarnings = analytics?.totalEarnings ?? 0
  const totalBookings = analytics?.totalBookings ?? 0
  const garageBreakdown = analytics?.garageBreakdown ?? []

  // Access Control: Block access to the metrics dashboard if user owns 0 garages
  if (totalGarages === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
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
              <span className="text-xl font-bold tracking-tight text-foreground">Access Restricted</span>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <UserButton />
            </div>
          </div>
        </header>

        {/* Restriction Content */}
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="max-w-md w-full bg-slate-50/80 dark:bg-white/2 backdrop-blur-xl border border-slate-200 dark:border-white/8 p-8 rounded-3xl text-center space-y-6 shadow-sm">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
              <Building2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-foreground">Owner Account Required</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This dashboard is private and reserved for registered garage owners to monitor metrics and reservations. To enable your owner privileges, onboard your garage first.
              </p>
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <Link
                href="/owner/new-garage"
                className="h-11 w-full bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center hover:opacity-95 transition-opacity cursor-pointer text-xs"
              >
                Onboard Your Garage
              </Link>
              <button
                onClick={() => router.push("/")}
                className="h-11 w-full border border-border bg-transparent text-foreground font-bold rounded-xl flex items-center justify-center hover:bg-muted/10 transition-all cursor-pointer text-xs"
              >
                Go Back Home
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">

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
            <span className="text-xl font-bold tracking-tight text-foreground">Owner Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin text-primary" : ""}`} />
            </button>
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 space-y-10">
        
        {/* Title and Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">Analytics Overview</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Performance metrics and reservations details across all your garages.
            </p>
          </div>
          <Link
            href="/owner/new-garage"
            className="self-start sm:self-center h-10 px-5 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity cursor-pointer text-sm shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
          >
            <Plus className="h-4 w-4" />
            <span>Onboard Garage</span>
          </Link>
        </div>

        {/* Stats Cards Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Card 1: Total Revenue */}
          <div className="bg-slate-50/80 dark:bg-white/2 backdrop-blur-xl border border-slate-200 dark:border-white/8 p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="space-y-1 relative z-10">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Earnings</span>
              <h3 className="text-2xl font-black text-emerald-500">{totalEarnings.toLocaleString()} NPR</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 relative z-10">
              <Coins className="h-6 w-6" />
            </div>
          </div>

          {/* Card 2: Owned Garages */}
          <div className="bg-slate-50/80 dark:bg-white/2 backdrop-blur-xl border border-slate-200 dark:border-white/8 p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="space-y-1 relative z-10">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Active Garages</span>
              <h3 className="text-2xl font-black text-foreground">{totalGarages} Garages</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary relative z-10">
              <Building2 className="h-6 w-6" />
            </div>
          </div>

          {/* Card 3: Total Bookings */}
          <div className="bg-slate-50/80 dark:bg-white/2 backdrop-blur-xl border border-slate-200 dark:border-white/8 p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="space-y-1 relative z-10">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Bookings</span>
              <h3 className="text-2xl font-black text-foreground">{totalBookings} Spots</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 relative z-10">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Charts Container Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Revenue Trend Area Chart (2/3 width) */}
          <div className="md:col-span-2 bg-slate-50/80 dark:bg-white/2 backdrop-blur-xl border border-slate-200 dark:border-white/8 p-6 rounded-3xl shadow-sm space-y-4 relative">
            <div>
              <h3 className="text-lg font-bold text-foreground">Revenue Trend</h3>
              <p className="text-xs text-muted-foreground">Daily earnings summary for confirmed reservations</p>
            </div>
            
            <div className="relative w-full h-[220px]">
              <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
                  </linearGradient>
                  <linearGradient id="stroke-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#059669" />
                    <stop offset="50%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
                
                {/* Horizontal Grid lines & Y axis labels */}
                {Array.from({ length: 4 }).map((_, i) => {
                  const y = 20 + i * 46;
                  const val = Math.round(svgMetrics.maxVal * (1 - i / 3));
                  return (
                    <g key={i}>
                      <line 
                        x1="50" 
                        y1={y} 
                        x2="470" 
                        y2={y} 
                        className="stroke-border/40" 
                        strokeDasharray="4 4"
                      />
                      <text 
                        x="40" 
                        y={y + 4} 
                        className="fill-muted-foreground text-[10px] text-right font-mono" 
                        textAnchor="end"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}
                
                {/* Area under the path */}
                {svgMetrics.points.length > 0 && (
                  <path 
                    d={svgMetrics.areaD} 
                    fill="url(#area-grad)" 
                  />
                )}
                
                {/* Main Path Line */}
                {svgMetrics.points.length > 0 && (
                  <path 
                    d={svgMetrics.pathD} 
                    fill="none" 
                    stroke="url(#stroke-grad)" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                
                {/* Point Dots */}
                {svgMetrics.points.map((p, idx) => (
                  <circle
                    key={idx}
                    cx={p.x}
                    cy={p.y}
                    r={hoveredPoint?.label === p.label ? "6" : "4"}
                    className="fill-emerald-500 stroke-background transition-all duration-150"
                    strokeWidth="2"
                  />
                ))}
                
                {/* X Axis Labels */}
                {svgMetrics.points.map((p, idx) => (
                  <text
                    key={idx}
                    x={p.x}
                    y="185"
                    className="fill-muted-foreground text-[9px] font-semibold"
                    textAnchor="middle"
                  >
                    {p.label}
                  </text>
                ))}
              </svg>
              
              {/* Tooltip Overlay */}
              {hoveredPoint && (
                <div 
                  className="absolute bg-card/95 border border-border backdrop-blur-md px-3 py-1.5 shadow-xl rounded-xl z-20 pointer-events-none select-none -translate-x-1/2 -translate-y-full"
                  style={{ 
                    left: `${(hoveredPoint.x / 500) * 100}%`, 
                    top: `${(hoveredPoint.y / 200) * 100 - 10}%`
                  }}
                >
                  <span className="block text-[8px] uppercase tracking-wider text-muted-foreground font-extrabold">{hoveredPoint.label}</span>
                  <span className="block text-xs font-black text-emerald-500">{hoveredPoint.value.toLocaleString()} NPR</span>
                </div>
              )}
              
              {/* Transparent Interactive Hover areas */}
              {svgMetrics.points.map((p, idx) => (
                <div
                  key={idx}
                  className="absolute cursor-pointer pointer-events-auto"
                  style={{
                    left: `${(p.x / 500) * 100}%`,
                    top: `${(p.y / 200) * 100}%`,
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 30
                  }}
                  onMouseEnter={() => setHoveredPoint(p)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
            </div>
          </div>
          
          {/* Garage share chart (1/3 width) */}
          <div className="bg-slate-50/80 dark:bg-white/2 backdrop-blur-xl border border-slate-200 dark:border-white/8 p-6 rounded-3xl shadow-sm space-y-5">
            <div>
              <h3 className="text-lg font-bold text-foreground">Revenue Share</h3>
              <p className="text-xs text-muted-foreground">Earnings distribution across garages</p>
            </div>
            
            <div className="space-y-4">
              {garageBreakdown.map((garage) => {
                const percentage = totalEarnings > 0 
                  ? Math.round((garage.earnings / totalEarnings) * 100) 
                  : 0;
                  
                return (
                  <div key={garage.garageId} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-foreground truncate max-w-[150px]">{garage.garageName}</span>
                      <span className="text-muted-foreground font-mono">{percentage}% ({garage.earnings.toLocaleString()} NPR)</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Garages Table / Status Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span>Garages Status</span>
          </h2>
          {garageBreakdown.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl space-y-4">
              <Building2 className="h-10 w-10 text-muted-foreground mx-auto" />
              <div className="space-y-1">
                <h4 className="font-bold text-foreground">No garages onboarded</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  You haven't registered any parking space yet. Get started by registering your first garage.
                </p>
              </div>
              <Link
                href="/owner/new-garage"
                className="inline-flex h-9 px-4 items-center justify-center gap-1.5 bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity cursor-pointer text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Register Garage</span>
              </Link>
            </div>
          ) : (
            <div className="bg-card/45 backdrop-blur-md border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/80 text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-muted/20">
                      <th className="px-6 py-4">Garage Details</th>
                      <th className="px-6 py-4">Capacity</th>
                      <th className="px-6 py-4">Hourly Rate</th>
                      <th className="px-6 py-4">Bookings Count</th>
                      <th className="px-6 py-4">Revenue Generated</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-sm">
                    {garageBreakdown.map((garage) => (
                      <tr 
                        key={garage.garageId} 
                        className="hover:bg-muted/10 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <span className="font-bold text-foreground block">{garage.garageName}</span>
                            <span className="text-xs text-muted-foreground block truncate max-w-xs">{garage.garageAddress}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-muted-foreground">
                          {garage.totalSpots} spots
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-muted-foreground">
                          {garage.ratePerHour} NPR/hr
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-muted-foreground">
                          {garage.bookingsCount} reservations
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-black text-emerald-500">{garage.earnings.toLocaleString()} NPR</span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Link
                            href={`/owner/edit-garage/${garage.garageId}`}
                            className="inline-flex h-8 px-3 items-center justify-center gap-1 bg-primary/10 hover:bg-primary/20 text-primary font-bold transition-all text-xs rounded-full border border-primary/20"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(garage.garageId, garage.garageName)}
                            disabled={isDeleting}
                            className="inline-flex h-8 px-3 items-center justify-center gap-1 bg-destructive/10 hover:bg-destructive/20 text-destructive font-bold transition-all text-xs rounded-full border border-destructive/20 disabled:opacity-50 cursor-pointer"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Recent Bookings Feed Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <span>Recent Activity</span>
          </h2>
          {recentBookings.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl space-y-3">
              <Clock className="h-10 w-10 text-muted-foreground mx-auto" />
              <h4 className="font-bold text-foreground">No recent bookings</h4>
              <p className="text-xs text-muted-foreground">
                Reservations activity will be displayed here as drivers book spots.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentBookings.map((b) => {
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
                    className="bg-card/40 backdrop-blur-md border border-border p-6 rounded-2xl flex flex-col md:flex-row justify-between gap-4 hover:border-border/80 transition-all shadow-sm"
                  >
                    <div className="flex gap-4">
                      {/* Visual Indicator */}
                      <div className="w-10 h-10 bg-muted border border-border rounded-xl flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>

                      {/* Info Details */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-bold text-foreground text-sm">{b.garageName}</span>
                          <span className="text-xs text-muted-foreground">• Spot {b.spotNumber}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          Driver: {b.driverId}
                        </div>
                        
                        {/* Timeline */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                          <div className="flex items-center gap-1">
                            <span className="font-bold uppercase tracking-wider text-[8px] text-muted-foreground/60">From:</span>
                            <span>{formatDatetime(b.startTime)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-bold uppercase tracking-wider text-[8px] text-muted-foreground/60">To:</span>
                            <span>{formatDatetime(b.endTime)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status & Amount */}
                    <div className="flex flex-row md:flex-col justify-between items-center md:items-end gap-3 shrink-0">
                      <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 border rounded-full ${statusStyle}`}>
                        {statusIcon}
                        <span className="capitalize">{statusLabel.toLowerCase()}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[8px] uppercase font-bold tracking-wider text-muted-foreground">Paid Amount</span>
                        <span className="text-sm font-black text-emerald-500">{b.baseAmount} NPR</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
