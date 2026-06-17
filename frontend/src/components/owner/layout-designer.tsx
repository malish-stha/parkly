"use client"

import { useState, useEffect } from "react"
import { Grid, Zap, Truck, Car } from "lucide-react"

interface SpotConfig {
  spotNumber: string;
  vehicleType: "STANDARD" | "EV" | "SUV";
}

interface LayoutDesignerProps {
  onChange: (spots: SpotConfig[]) => void;
}

export function LayoutDesigner({ onChange }: LayoutDesignerProps) {
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(5)
  const [spotsMap, setSpotsMap] = useState<Record<string, "STANDARD" | "EV" | "SUV">>({})

  // Generate the initial grid layout on load or size changes
  useEffect(() => {
    const newMap: Record<string, "STANDARD" | "EV" | "SUV"> = { ...spotsMap }
    let changed = false

    for (let r = 0; r < rows; r++) {
      const rowLetter = String.fromCharCode(65 + r) // A, B, C...
      for (let c = 1; c <= cols; c++) {
        const spotNum = `${rowLetter}${c}`
        if (!newMap[spotNum]) {
          newMap[spotNum] = "STANDARD" // Default type
          changed = true
        }
      }
    }

    // Clean up out of bounds spots
    Object.keys(newMap).forEach((spotNum) => {
      const rowLetter = spotNum.charAt(0)
      const colNum = parseInt(spotNum.substring(1), 10)
      const maxRowLetter = String.fromCharCode(65 + rows - 1)
      
      if (rowLetter > maxRowLetter || colNum > cols) {
        delete newMap[spotNum]
        changed = true
      }
    })

    if (changed || Object.keys(spotsMap).length === 0) {
      setSpotsMap(newMap)
      triggerChange(newMap)
    }
  }, [rows, cols])

  const triggerChange = (currentMap: Record<string, "STANDARD" | "EV" | "SUV">) => {
    const list = Object.entries(currentMap).map(([spotNumber, vehicleType]) => ({
      spotNumber,
      vehicleType,
    }))
    onChange(list)
  }

  const toggleSpotType = (spotNum: string) => {
    const currentType = spotsMap[spotNum]
    let nextType: "STANDARD" | "EV" | "SUV" = "STANDARD"

    if (currentType === "STANDARD") nextType = "EV"
    else if (currentType === "EV") nextType = "SUV"

    const updatedMap = {
      ...spotsMap,
      [spotNum]: nextType,
    }
    setSpotsMap(updatedMap)
    triggerChange(updatedMap)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 space-y-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Grid className="h-4 w-4 text-primary" />
            <span>Number of Rows (A-Z)</span>
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={rows}
            onChange={(e) => setRows(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-full h-10 px-3 border border-border bg-card text-foreground focus:outline-none focus:border-primary text-sm rounded-none"
          />
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Grid className="h-4 w-4 text-primary" />
            <span>Spots Per Row</span>
          </label>
          <input
            type="number"
            min={1}
            max={15}
            value={cols}
            onChange={(e) => setCols(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-full h-10 px-3 border border-border bg-card text-foreground focus:outline-none focus:border-primary text-sm rounded-none"
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs font-semibold py-2 px-3 bg-muted border border-border">
        <span className="text-muted-foreground mr-2 uppercase tracking-wider">Legend:</span>
        <div className="flex items-center gap-1">
          <span className="w-3.5 h-3.5 border border-border bg-card inline-block"></span>
          <span>Standard</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-500">
          <span className="w-3.5 h-3.5 bg-emerald-500/10 border border-emerald-500 inline-block flex items-center justify-center">
            <Zap className="h-2 w-2" />
          </span>
          <span>EV Charger</span>
        </div>
        <div className="flex items-center gap-1 text-blue-500">
          <span className="w-3.5 h-3.5 bg-blue-500/10 border border-blue-500 inline-block flex items-center justify-center">
            <Truck className="h-2 w-2" />
          </span>
          <span>Large SUV</span>
        </div>
      </div>

      {/* Grid Layout Canvas */}
      <div className="border border-border p-4 bg-muted/30 overflow-x-auto">
        <div 
          className="grid gap-2.5 mx-auto" 
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(64px, 1fr))` }}
        >
          {Array.from({ length: rows }).map((_, r) => {
            const rowLetter = String.fromCharCode(65 + r)
            return Array.from({ length: cols }).map((_, c) => {
              const spotNum = `${rowLetter}${c + 1}`
              const type = spotsMap[spotNum] || "STANDARD"
              
              let typeStyles = "bg-card border-border hover:bg-muted/80 text-foreground"
              let icon = <Car className="h-4 w-4 opacity-50" />
              
              if (type === "EV") {
                typeStyles = "bg-emerald-500/10 border-emerald-500 hover:bg-emerald-500/20 text-emerald-500"
                icon = <Zap className="h-4 w-4" />
              } else if (type === "SUV") {
                typeStyles = "bg-blue-500/10 border-blue-500 hover:bg-blue-500/20 text-blue-500"
                icon = <Truck className="h-4 w-4" />
              }

              return (
                <button
                  key={spotNum}
                  type="button"
                  onClick={() => toggleSpotType(spotNum)}
                  className={`border p-3 flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer rounded-none select-none h-16 ${typeStyles}`}
                >
                  <span>{spotNum}</span>
                  {icon}
                </button>
              )
            })
          })}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground text-center italic">
        *Click on any spot inside the grid to toggle its vehicle configuration type.
      </p>
    </div>
  )
}
