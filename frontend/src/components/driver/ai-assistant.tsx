"use client"

import { useState, useRef, useEffect } from "react"
import { X, Send, Sparkles, MapPin, Banknote, Car, ArrowRight, Loader2 } from "lucide-react"
import { useLazyAiSearchGaragesQuery, GarageSearchDto } from "@/store/apiSlice"

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  garages?: GarageSearchDto[];
}

interface AIAssistantProps {
  onClose: () => void;
  onNavigateToGarage: (garage: GarageSearchDto) => void;
  center: { lat: number; lng: number };
  onCenterChange?: (lat: number, lng: number) => void;
}

export default function AIAssistant({ onClose, onNavigateToGarage, center, onCenterChange }: AIAssistantProps) {
  const [inputText, setInputText] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Namaste! I am your Parkly AI Finder. 🚗✨\n\nTell me what you are looking for! For example:\n• \"Find me EV charging spots under 100 near Thamel\"\n• \"Are there standard parking spots under 90 near Sundhara?\"\n• \"Suggest cheap parking below 120 near Durbar Marg\"",
    },
  ])

  const [triggerAiSearch, { isFetching }] = useLazyAiSearchGaragesQuery()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isFetching])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return

    const userText = inputText.trim()
    setInputText("")

    // 1. Add User Message
    const userMsgId = Date.now().toString()
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: "user", text: userText },
    ])

    try {
      // 2. Call API search
      const result = await triggerAiSearch({
        query: userText,
        lat: center.lat,
        lng: center.lng,
      }).unwrap()

      if (result.resolvedLat !== undefined && result.resolvedLng !== undefined) {
        onCenterChange?.(result.resolvedLat, result.resolvedLng)
      }

      // 3. Construct Bot Message
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: result.message,
          garages: result.garages,
        },
      ])
    } catch (err) {
      console.error("AI Search Failed", err)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: "Apologies, I encountered an issue querying the smart catalog. Please try again shortly.",
        },
      ])
    }
  }

  // Calculate distance helper
  const getProximityText = (garageLat: number, garageLng: number) => {
    const R = 6371 // Earth radius in km
    const dLat = ((garageLat - center.lat) * Math.PI) / 180
    const dLon = ((garageLng - center.lng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((center.lat * Math.PI) / 180) *
        Math.cos((garageLat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const dist = R * c
    return dist < 1 ? `${Math.round(dist * 1000)} meters away` : `${dist.toFixed(1)} km away`
  }

  return (
    <div className="fixed top-16 right-0 bottom-0 z-40 w-full md:w-[480px] bg-card/95 backdrop-blur-xl border-l border-border shadow-2xl flex flex-col rounded-none animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-base tracking-tight text-foreground">AI Search Assistant</h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Conversational Finder</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Chat Messages Timeline */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col max-w-[85%] ${
              msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
            }`}
          >
            {/* Message Bubble */}
            <div
              className={`p-4 text-xs font-semibold whitespace-pre-wrap leading-relaxed shadow-sm ${
                msg.sender === "user"
                  ? "bg-primary text-primary-foreground rounded-l-2xl rounded-tr-2xl"
                  : "bg-muted text-foreground border border-border rounded-r-2xl rounded-tl-2xl"
              }`}
            >
              {msg.text}
            </div>

            {/* Garage Cards Attachment */}
            {msg.garages && msg.garages.length > 0 && (
              <div className="w-full mt-3 space-y-3">
                {msg.garages.map((garage) => {
                  const openSpots = garage.spots?.filter((s) => s.status === "AVAILABLE").length || 0
                  return (
                    <div
                      key={garage.id}
                      className="bg-card border border-border rounded-xl overflow-hidden shadow-md hover:border-primary/50 transition-colors flex flex-col"
                    >
                      {/* Image header */}
                      {garage.imageUrl && (
                        <div className="h-32 w-full relative overflow-hidden bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={garage.imageUrl}
                            alt={garage.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-primary">
                            {getProximityText(garage.latitude, garage.longitude)}
                          </div>
                        </div>
                      )}

                      {/* Content details */}
                      <div className="p-4 space-y-3">
                        <div>
                          <span className="font-extrabold text-foreground text-sm block">{garage.name}</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-primary/70 shrink-0" />
                            <span className="truncate">{garage.address}</span>
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-xs border-t border-border pt-2">
                          <span className="flex items-center gap-1 font-bold text-emerald-500">
                            <Banknote className="h-3.5 w-3.5" />
                            <span>{garage.ratePerHour} NPR/hr</span>
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-muted-foreground">
                            <Car className="h-3.5 w-3.5" />
                            <span>{openSpots} available</span>
                          </span>
                        </div>

                        <button
                          onClick={() => onNavigateToGarage(garage)}
                          className="w-full h-9 mt-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground text-xs font-bold hover:opacity-95 transition-opacity rounded-lg cursor-pointer"
                        >
                          <span>Navigate & Reserve</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}

        {/* Bot Typing Indicator */}
        {isFetching && (
          <div className="flex flex-col mr-auto items-start max-w-[85%] animate-pulse">
            <div className="p-4 bg-muted border border-border rounded-r-2xl rounded-tl-2xl flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground font-semibold">Analyzing smart catalogue...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="p-4 border-t border-border bg-background flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask AI Assistant for spots..."
          className="flex-1 h-10 px-4 border border-border bg-card text-foreground focus:outline-none focus:border-primary text-xs rounded-full"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isFetching}
          className="h-10 w-10 flex items-center justify-center bg-primary text-primary-foreground hover:opacity-95 disabled:opacity-50 cursor-pointer rounded-full transition-opacity"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
