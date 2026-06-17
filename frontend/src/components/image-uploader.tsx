"use client"

import { useState } from "react"
import { Upload, Check, Loader2, Image as ImageIcon } from "lucide-react"
import { UploadDropzone } from "@/lib/uploadthing"

interface ImageUploaderProps {
  onUploadComplete: (url: string) => void;
  value?: string;
}

const PRESET_GARAGE_IMAGES = [
  "https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&auto=format&fit=crop&q=80"
];

export function ImageUploader({ onUploadComplete, value }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(value)
  const [uploadSource, setUploadSource] = useState<"uploadthing" | "mock">("mock")

  // Checks if uploadthing variables are set (can be toggled based on presence of API keys)
  const hasUploadthingKeys = false; // Toggle to true if keys are injected

  const simulateMockUpload = () => {
    setIsUploading(true)
    setTimeout(() => {
      // Pick a random beautiful preset garage image
      const randomImage = PRESET_GARAGE_IMAGES[Math.floor(Math.random() * PRESET_GARAGE_IMAGES.length)];
      setPreviewUrl(randomImage)
      onUploadComplete(randomImage)
      setIsUploading(false)
      setUploadSource("mock")
    }, 1500)
  }

  if (previewUrl) {
    return (
      <div className="relative border border-border bg-card p-4 flex flex-col items-center justify-center space-y-4">
        <div className="relative w-full h-48 overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Garage Preview"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex items-center gap-2 text-emerald-500 text-sm font-semibold">
          <Check className="h-4 w-4" />
          <span>Image Uploaded Successfully ({uploadSource === "mock" ? "Demo Mode" : "Cloud Storage"})</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setPreviewUrl(undefined)
            onUploadComplete("")
          }}
          className="text-xs text-destructive hover:underline cursor-pointer"
        >
          Remove Image
        </button>
      </div>
    )
  }

  return (
    <div className="border border-dashed border-border bg-card p-8 flex flex-col items-center justify-center text-center space-y-4">
      {hasUploadthingKeys ? (
        <div className="w-full">
          <UploadDropzone
            endpoint="garageImageUploader"
            onClientUploadComplete={(res) => {
              if (res && res[0]) {
                setPreviewUrl(res[0].url)
                onUploadComplete(res[0].url)
                setUploadSource("uploadthing")
              }
            }}
            onUploadError={(error: Error) => {
              alert(`Upload failed: ${error.message}. Falling back to demo mode.`);
              simulateMockUpload();
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-4 w-full">
          <div className="p-3 bg-muted rounded-none text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Upload Garage Cover Image</p>
            <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP up to 4MB</p>
          </div>
          <button
            type="button"
            disabled={isUploading}
            onClick={simulateMockUpload}
            className="h-10 px-4 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer text-sm"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Simulating Upload...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Select & Upload Image</span>
              </>
            )}
          </button>
          <span className="text-[10px] text-muted-foreground italic">
            Running in local demo mode (uploads presets automatically)
          </span>
        </div>
      )}
    </div>
  )
}
