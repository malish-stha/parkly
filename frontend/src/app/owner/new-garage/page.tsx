"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Landmark, MapPin, Banknote, Image as ImageIcon, Send, Loader2 } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { ImageUploader } from "@/components/image-uploader"
import { LayoutDesigner } from "@/components/owner/layout-designer"
import { useCreateGarageMutation } from "@/store/apiSlice"
import { UserButton } from "@clerk/nextjs"

interface SpotConfig {
  spotNumber: string;
  vehicleType: "STANDARD" | "EV" | "SUV";
}

export default function NewGaragePage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [latitude, setLatitude] = useState(27.7172) // Kathmandu default
  const [longitude, setLongitude] = useState(85.3240) // Kathmandu default
  const [ratePerHour, setRatePerHour] = useState("10") // 100 NPR default
  const [imageUrl, setImageUrl] = useState("")
  const [spots, setSpots] = useState<SpotConfig[]>([])
  
  const [createGarage, { isLoading: isSubmitting, isSuccess: success }] = useCreateGarageMutation()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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
    }

    try {
      await createGarage(payload).unwrap()
      setTimeout(() => {
        router.push("/")
      }, 2000)
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || "An error occurred during submission."
      setErrorMsg(msg)
    }
  }


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/")}
              className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-xl font-bold tracking-tight text-foreground">Onboard Garage</span>
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
            <h2 className="text-2xl font-bold text-emerald-500">Garage Saved Successfully!</h2>
            <p className="text-muted-foreground text-sm">
              Your parking lot and its spots have been registered in the catalog. Redirecting...
            </p>
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">Garage Details</h2>
              <p className="text-sm text-muted-foreground">
                Provide the base information, location, and visual configurations for your parking lot.
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

            <hr className="border-border" />

            {/* Grid Layout Section */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold tracking-tight">Spots Configuration Grid</h3>
                <p className="text-xs text-muted-foreground">
                  Build the layout map. Allocate the columns, rows, and spot capabilities.
                </p>
              </div>
              <LayoutDesigner onChange={(updatedSpots) => setSpots(updatedSpots)} />
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
                    <span>Creating Garage...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Onboard and Create Layout</span>
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
