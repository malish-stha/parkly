import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-primary">Parkly</span>
          </div>
          <nav className="flex items-center gap-6">
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-foreground">
            Smart Parking, <span className="text-primary">Effortless Reservation</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto font-sans">
            Find and book compatible spots in seconds. Enforce timers, check routes, and pay securely.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Link 
              href="/search" 
              className="h-11 px-6 flex items-center justify-center bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity cursor-pointer rounded-none text-sm"
            >
              Find a Spot
            </Link>
            <Link 
              href="/owner/new-garage" 
              className="h-11 px-6 flex items-center justify-center border border-input bg-background font-semibold hover:bg-muted transition-colors cursor-pointer rounded-none text-sm"
            >
              Register Garage
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid (Checking theme variables) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-20 px-4">
          <div className="rounded-none border border-border bg-card p-6 text-card-foreground shadow-sm">
            <h3 className="text-lg font-bold text-foreground">AI Slot Finder</h3>
            <p className="text-muted-foreground mt-2 text-sm font-sans">
              Use natural language queries to immediately locate nearby EV, SUV, or standard spaces.
            </p>
          </div>
          <div className="rounded-none border border-border bg-card p-6 text-card-foreground shadow-sm">
            <h3 className="text-lg font-bold text-foreground">Stripe Integration</h3>
            <p className="text-muted-foreground mt-2 text-sm font-sans">
              Secures booking locks with a 15-minute countdown clock and automatic release timers.
            </p>
          </div>
          <div className="rounded-none border border-border bg-card p-6 text-card-foreground shadow-sm">
            <h3 className="text-lg font-bold text-foreground">OSRM Map Routing</h3>
            <p className="text-muted-foreground mt-2 text-sm font-sans">
              Displays the shortest road distance and estimated driving time directly on Leaflet map.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6 text-center text-sm text-muted-foreground">
        <p>© 2026 Parkly Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
