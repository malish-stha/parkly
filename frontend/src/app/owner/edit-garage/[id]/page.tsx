"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Landmark, MapPin, Banknote, Image as ImageIcon, Send, Loader2, Crown, Users } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { ImageUploader } from "@/components/image-uploader"
import { LayoutDesigner } from "@/components/owner/layout-designer"
import { 
  useGetGarageDetailsQuery, 
  useUpdateGarageMutation,
  useGetSubscriptionStatusQuery,
  useGetGarageStaffQuery,
  useAddGarageStaffMutation,
  useRemoveGarageStaffMutation
} from "@/store/apiSlice"
import { UserButton, useAuth } from "@clerk/nextjs"
import Link from "next/link"

interface SpotConfig {
  spotNumber: string;
  vehicleType: "STANDARD" | "EV" | "SUV" | "BIKE";
}

interface EditGaragePageProps {
  params: Promise<{ id: string }>;
}

export default function EditGaragePage({ params }: EditGaragePageProps) {
  const unwrappedParams = use(params)
  const id = Number(unwrappedParams.id)
  
  const router = useRouter()
  const { userId, isLoaded } = useAuth()
  const { data: garage, isLoading: isFetching, error: fetchError } = useGetGarageDetailsQuery(id)

  const { data: subStatus } = useGetSubscriptionStatusQuery(undefined, {
    skip: !isLoaded || !userId
  })
  const isPro = subStatus?.type === "OWNER_PRO" && subStatus?.status === "ACTIVE"

  const { data: staffList, refetch: refetchStaff, isLoading: isStaffLoading } = useGetGarageStaffQuery(id, {
    skip: !isPro
  })
  const [addGarageStaff, { isLoading: isAddingStaff }] = useAddGarageStaffMutation()
  const [removeGarageStaff, { isLoading: isRemovingStaff }] = useRemoveGarageStaffMutation()
  
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [latitude, setLatitude] = useState(27.7172)
  const [longitude, setLongitude] = useState(85.3240)
  const [ratePerHour, setRatePerHour] = useState("10")
  const [imageUrl, setImageUrl] = useState("")
  const [spots, setSpots] = useState<SpotConfig[]>([])

  const [dynamicPricingEnabled, setDynamicPricingEnabled] = useState(false)
  const [featured, setFeatured] = useState(false)
  
  const [staffInput, setStaffInput] = useState("")
  const [staffError, setStaffError] = useState<string | null>(null)

  const [updateGarage, { isLoading: isSubmitting, isSuccess: success }] = useUpdateGarageMutation()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleAddStaff = async () => {
    if (!staffInput.trim()) return
    setStaffError(null)
    try {
      await addGarageStaff({ garageId: id, staffUserId: staffInput.trim() }).unwrap()
      setStaffInput("")
      refetchStaff()
    } catch (err: any) {
      setStaffError(err?.data?.error || "Failed to add staff member.")
    }
  }

  const handleRemoveStaff = async (staffUserId: string) => {
    setStaffError(null)
    try {
      await removeGarageStaff({ garageId: id, staffUserId }).unwrap()
      refetchStaff()
    } catch (err: any) {
      setStaffError(err?.data?.error || "Failed to remove staff member.")
    }
  }

  // Pre-populate form state when garage details are loaded
  useEffect(() => {
    if (garage) {
      setName(garage.name)
      setAddress(garage.address)
      setLatitude(garage.latitude)
      setLongitude(garage.longitude)
      setRatePerHour(String(garage.ratePerHour))
      setImageUrl(garage.imageUrl || "")
      setDynamicPricingEnabled(garage.dynamicPricingEnabled || false)
      setFeatured(garage.featured || false)
      setSpots(
        garage.spots.map((s) => ({
          spotNumber: s.spotNumber,
          vehicleType: s.vehicleType,
        }))
      )
    }
  }, [garage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !address || !ratePerHour) {
      setErrorMsg("Please fill out all required fields.")
      return
    }
    if (spots.length === 0) {
      setErrorMsg("Please configure at least one spot inside the layout grid.")
      return
    }

    setErrorMsg(null)

    const payload = {
      name,
      address,
      latitude,
      longitude,
      ratePerHour: parseFloat(ratePerHour),
      imageUrl,
      spots,
      dynamicPricingEnabled,
      featured,
    }

    try {
      await updateGarage({ id, body: payload }).unwrap()
      setTimeout(() => {
        router.push("/owner/analytics")
      }, 2000)
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || "An error occurred during submission."
      setErrorMsg(msg)
    }
  }

  if (isFetching) {
    return (
      <div className="w-full h-screen bg-background flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground font-semibold">Loading Garage Configuration...</span>
      </div>
    )
  }

  if (fetchError || !garage) {
    return (
      <div className="w-full h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <span className="text-sm font-semibold text-destructive">Failed to load garage details.</span>
        <button
          onClick={() => router.push("/owner/analytics")}
          className="h-10 px-4 bg-primary text-primary-foreground font-semibold hover:opacity-90 flex items-center gap-2 rounded-none"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Owner Dashboard</span>
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/owner/analytics")}
              className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-xl font-bold tracking-tight text-foreground">Edit Garage: {garage.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
      </header>

      {/* Form Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12">
        {success ? (
          <div className="border border-emerald-500 bg-emerald-500/10 p-8 text-center space-y-4">
            <h2 className="text-2xl font-bold text-emerald-500">Garage Updated Successfully!</h2>
            <p className="text-muted-foreground text-sm">
              Your parking lot and its spots updates have been saved. Redirecting to dashboard...
            </p>
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">Onboarded Garage configuration</h2>
              <p className="text-sm text-muted-foreground">
                You can update the name, rate, location coordinates, image, and grid spots allocation.
              </p>
            </div>

            {errorMsg && (
              <div className="border border-destructive bg-destructive/10 p-4 text-sm font-semibold text-destructive">
                {errorMsg}
              </div>
            )}

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Metadata */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-primary" />
                    <span>Garage Name *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Durbar Square Parking Complex"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 px-3 border border-border bg-card text-foreground focus:outline-none focus:border-primary text-sm rounded-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>Street Address *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kantipath, Kathmandu"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full h-10 px-3 border border-border bg-card text-foreground focus:outline-none focus:border-primary text-sm rounded-none"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>Latitude *</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={latitude}
                      onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                      className="w-full h-10 px-3 border border-border bg-card text-foreground focus:outline-none focus:border-primary text-sm rounded-none"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>Longitude *</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={longitude}
                      onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                      className="w-full h-10 px-3 border border-border bg-card text-foreground focus:outline-none focus:border-primary text-sm rounded-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-primary" />
                    <span>Hourly Rate (NPR) *</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    placeholder="e.g. 100"
                    value={ratePerHour}
                    onChange={(e) => setRatePerHour(e.target.value)}
                    className="w-full h-10 px-3 border border-border bg-card text-foreground focus:outline-none focus:border-primary text-sm rounded-none"
                  />
                </div>

                {/* Premium Perks Section */}
                <div className="border border-border/85 p-4 bg-muted/20 space-y-4">
                  <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                    <Crown className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-black uppercase tracking-wider text-foreground">Premium Lot Configurations</span>
                  </div>

                  {/* Dynamic Pricing Toggle */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="dynamicPricingEnabled"
                      disabled={!isPro}
                      checked={dynamicPricingEnabled}
                      onChange={(e) => setDynamicPricingEnabled(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                    />
                    <div className="space-y-0.5">
                      <label htmlFor="dynamicPricingEnabled" className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1.5 select-none">
                        Enable Dynamic Surge Pricing
                        {!isPro && <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-black uppercase">PRO</span>}
                      </label>
                      <p className="text-[10px] text-muted-foreground leading-normal">
                        Automatically increases hourly parking rates by +10% when occupancy exceeds 50%, and +20% when occupancy exceeds 80%.
                      </p>
                    </div>
                  </div>

                  {/* Featured Badge Toggle */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="featured"
                      disabled={!isPro}
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                    />
                    <div className="space-y-0.5">
                      <label htmlFor="featured" className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1.5 select-none">
                        Featured Map Placement
                        {!isPro && <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-black uppercase">PRO</span>}
                      </label>
                      <p className="text-[10px] text-muted-foreground leading-normal">
                        Highlights your garage on the driver search map with golden star overlays for top visibility.
                      </p>
                    </div>
                  </div>

                  {!isPro && (
                    <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/5 p-2 border border-amber-500/20 rounded">
                      ⚠️ Premium toggles require an active <Link href="/subscription" className="underline hover:text-amber-500">Business Pro subscription</Link>.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Image Upload */}
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  <span>Garage Photo</span>
                </label>
                <ImageUploader onUploadComplete={(url) => setImageUrl(url)} value={imageUrl} />
              </div>
            </div>

            {/* Staff Management Panel */}
            <div className="border border-border p-6 bg-muted/10 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span>Garage Staff Management</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">Register lot attendants to handle driver check-ins and inspect stats.</p>
                </div>
                {!isPro && (
                  <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                    Business Pro
                  </span>
                )}
              </div>

              {!isPro ? (
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 text-xs font-semibold text-amber-700 dark:text-amber-300 leading-relaxed rounded text-center">
                  🔒 Staff Management is a premium Business Pro feature. Please <Link href="/subscription" className="underline text-amber-600 dark:text-amber-400 hover:text-amber-500">upgrade your subscription</Link> to add attendants.
                </div>
              ) : (
                <div className="space-y-4 font-sans">
                  {/* Add Attendant Form */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter clerk user ID (e.g. user_...)"
                      value={staffInput}
                      onChange={(e) => setStaffInput(e.target.value)}
                      className="flex-1 h-9 px-3 border border-border bg-card text-foreground focus:outline-none focus:border-primary text-xs rounded-none"
                    />
                    <button
                      type="button"
                      disabled={isAddingStaff || !staffInput.trim()}
                      onClick={handleAddStaff}
                      className="h-9 px-4 bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 text-xs flex items-center gap-1.5"
                    >
                      {isAddingStaff ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      Add Staff
                    </button>
                  </div>

                  {staffError && (
                    <div className="text-[10px] font-bold text-destructive">
                      ⚠️ {staffError}
                    </div>
                  )}

                  {/* List of Attendants */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Active Attendants ({staffList?.length || 0})</span>
                    {isStaffLoading ? (
                      <div className="text-xs text-muted-foreground py-2 flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Loading staff members...
                      </div>
                    ) : !staffList || staffList.length === 0 ? (
                      <div className="text-xs text-muted-foreground italic py-2">
                        No attendants registered yet. Attendants can log in using their Clerk ID to view stats.
                      </div>
                    ) : (
                      <div className="divide-y divide-border border border-border bg-card rounded-none max-h-40 overflow-y-auto">
                        {staffList.map((member: any) => (
                          <div key={member.id} className="flex justify-between items-center px-4 py-2.5 text-xs">
                            <div className="font-mono text-muted-foreground text-[10px]">{member.staffUserId}</div>
                            <button
                              type="button"
                              disabled={isRemovingStaff}
                              onClick={() => handleRemoveStaff(member.staffUserId)}
                              className="text-[10px] text-rose-500 font-extrabold hover:underline uppercase tracking-wide cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <hr className="border-border" />

            {/* Grid Layout Section */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold tracking-tight">Spots Configuration Grid</h3>
                <p className="text-xs text-muted-foreground">
                  Build the layout map. Allocate the columns, rows, and spot capabilities.
                </p>
              </div>
              {/* Load LayoutDesigner only after initial spots have been resolved */}
              {spots.length > 0 && (
                <LayoutDesigner initialSpots={spots} onChange={(updatedSpots) => setSpots(updatedSpots)} />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 px-8 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer rounded-none text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Save Layout Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
