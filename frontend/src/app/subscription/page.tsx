"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth, SignInButton } from "@clerk/nextjs";
import { 
  useGetSubscriptionStatusQuery, 
  useUpgradeSubscriptionMutation 
} from "@/store/apiSlice";
import { 
  ArrowLeft, 
  Check, 
  Crown, 
  Zap, 
  Shield, 
  Building, 
  Clock, 
  TrendingUp, 
  Sparkles, 
  Users, 
  DollarSign,
  Percent
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SubscriptionPage() {
  const { isLoaded, userId } = useAuth();
  
  // Queries & Mutations
  const { data: status, isLoading: isStatusLoading, refetch } = useGetSubscriptionStatusQuery(undefined, {
    skip: !isLoaded || !userId
  });
  
  const [upgradeSubscription, { isLoading: isUpgrading }] = useUpgradeSubscriptionMutation();
  const [actionMessage, setActionMessage] = useState<{ text: string; success: boolean } | null>(null);

  const handleSimulateUpgrade = async (type: "FREE" | "DRIVER_GOLD" | "OWNER_PRO") => {
    if (!userId) return;
    
    try {
      setActionMessage(null);
      const res = await upgradeSubscription({ type }).unwrap();
      setActionMessage({
        text: `Successfully simulated ${type === "FREE" ? "downgrade to Free tier" : `upgrade to ${type === "DRIVER_GOLD" ? "Driver Gold" : "Owner Business Pro"}`}!`,
        success: true
      });
      refetch();
    } catch (err: any) {
      console.error(err);
      setActionMessage({
        text: err?.data?.error || "An error occurred during upgrade simulation.",
        success: false
      });
    }
  };

  const getActivePlanName = () => {
    if (!userId) return "Not Signed In";
    if (isStatusLoading) return "Loading...";
    if (!status) return "Free Tier";
    
    switch (status.type) {
      case "DRIVER_GOLD":
        return "Driver Gold";
      case "OWNER_PRO":
        return "Owner Business Pro";
      default:
        return "Free Tier";
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-background text-foreground overflow-x-hidden font-sans">
      {/* Visual background lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header / Nav */}
      <nav className="relative z-10 flex justify-between items-center px-6 md:px-12 py-8 pointer-events-auto border-b border-black/10 dark:border-white/8 backdrop-blur-md">
        <Link href="/" className="text-xl md:text-2xl font-black flex items-center gap-3 tracking-tighter text-foreground select-none">
          <img src="/logo.png" alt="Parkly Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain" />
          PARK<span className="text-primary">LY</span>
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/"
            className="flex items-center gap-2 bg-white/5 dark:bg-white/2 backdrop-blur-2xl border border-black/10 dark:border-white/8 px-6 py-2.5 rounded-full text-[10px] font-black tracking-[0.2em] hover:bg-black/5 dark:hover:bg-white/5 transition text-foreground cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> BACK TO HOME
          </Link>
        </div>
      </nav>

      {/* Main Body */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20 flex flex-col items-center">
        {/* Title */}
        <div className="text-center max-w-3xl mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase mb-4 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" /> Introducing Subscriptions
          </div>
          <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tighter mb-4 text-foreground">
            Elevate Your <span className="text-primary">Parking Experience</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-base md:text-xl font-sans">
            Choose the premium plan that fits your driving convenience or scales your business profits.
          </p>
        </div>

        {/* Status / Alert Message */}
        <div className="w-full max-w-4xl mb-12">
          {actionMessage && (
            <div className={`p-4 mb-6 rounded-2xl border text-sm font-semibold flex items-center gap-3 transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
              actionMessage.success 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
                : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full ${actionMessage.success ? "bg-emerald-500" : "bg-red-500"}`} />
              <span>{actionMessage.text}</span>
            </div>
          )}

          {/* Current Status Box */}
          <div className="bg-slate-50/50 dark:bg-white/2 backdrop-blur-xl border border-slate-200 dark:border-white/8 p-6 md:p-8 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-black mb-1">YOUR ACCOUNT STATUS</p>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black text-foreground">
                  {getActivePlanName()}
                </h3>
                {userId && status?.type && status.type !== "FREE" && (
                  <span className="bg-primary/20 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase">
                    ACTIVE
                  </span>
                )}
              </div>
              {userId && status?.endDate && status.type !== "FREE" && (
                <p className="text-xs text-muted-foreground mt-1.5 font-sans">
                  Renews/Expires on: {new Date(status.endDate).toLocaleDateString()}
                </p>
              )}
              {!userId && (
                <p className="text-xs text-muted-foreground mt-1.5 font-sans">
                  Sign in to inspect and simulate upgrading your account.
                </p>
              )}
            </div>

            <div>
              {userId ? (
                status?.type && status.type !== "FREE" ? (
                  <button
                    disabled={isUpgrading}
                    onClick={() => handleSimulateUpgrade("FREE")}
                    className="w-full md:w-auto bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 hover:bg-slate-300 dark:hover:bg-white/10 text-foreground px-6 py-3 rounded-full text-xs font-black tracking-widest transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isUpgrading ? "PROCESSING..." : "DOWNGRADE TO FREE"}
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground font-semibold italic">
                    Free Account (Standard holding limit & rates)
                  </span>
                )
              ) : (
                <SignInButton mode="modal">
                  <button className="w-full md:w-auto bg-primary text-primary-foreground hover:scale-105 transition-all px-8 py-3 rounded-full text-xs font-black tracking-widest cursor-pointer shadow-md">
                    SIGN IN TO UPGRADE
                  </button>
                </SignInButton>
              )}
            </div>
          </div>
        </div>

        {/* Pricing Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl items-stretch">
          {/* Card 1: Free */}
          <div className="bg-slate-50/50 dark:bg-white/2 backdrop-blur-xl border border-slate-200 dark:border-white/8 p-8 rounded-3xl flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-lg shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black tracking-widest text-muted-foreground uppercase">DRIVERS & OWNERS</span>
                <Shield className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-black text-foreground mb-1">Free Tier</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-sans mb-6">Explore the Parkly network with standard capabilities.</p>
              
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-black text-foreground">NPR 0</span>
                <span className="text-xs text-muted-foreground font-sans">/ forever</span>
              </div>

              {/* Divider */}
              <div className="h-px bg-black/10 dark:bg-white/8 mb-8" />

              {/* Feature List */}
              <ul className="space-y-4 font-sans text-sm">
                <li className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-slate-300">10-minute hold limit on reservations</span>
                </li>
                <li className="flex items-start gap-3">
                  <DollarSign className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-slate-300">Standard rates for booking parking spaces</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-slate-300">Interactive live search map access</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <button
                disabled
                className="w-full bg-slate-100 dark:bg-white/2 text-slate-400 border border-slate-200 dark:border-white/5 py-4 rounded-full text-xs font-black tracking-widest uppercase select-none"
              >
                DEFAULT PLAN
              </button>
            </div>
          </div>

          {/* Card 2: Driver Gold */}
          <div className="relative bg-gradient-to-b from-amber-500/10 to-transparent dark:from-amber-500/5 backdrop-blur-xl border border-amber-500/30 p-8 rounded-3xl flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/5 shadow-md">
            <div className="absolute top-0 right-8 transform -translate-y-1/2 bg-amber-500 text-black text-[9px] font-black tracking-widest px-3 py-1 rounded-full uppercase">
              POPULAR
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black tracking-widest text-amber-600 dark:text-amber-400 uppercase">DRIVER ONLY</span>
                <Crown className="w-5 h-5 text-amber-500 animate-bounce" />
              </div>
              <h3 className="text-2xl font-black text-foreground mb-1">Driver Gold</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-sans mb-6">Enjoy extended booking protection and automatic discounts.</p>
              
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-black text-amber-600 dark:text-amber-400">NPR 499</span>
                <span className="text-xs text-muted-foreground font-sans">/ month</span>
              </div>

              {/* Divider */}
              <div className="h-px bg-amber-500/20 mb-8" />

              {/* Feature List */}
              <ul className="space-y-4 font-sans text-sm">
                <li className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-slate-200 font-semibold">30-minute hold protection limits</span>
                </li>
                <li className="flex items-start gap-3">
                  <Percent className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-slate-200 font-semibold">Flat 10% discount on all hourly rates</span>
                </li>
                <li className="flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-slate-200">Highlight gold marker overlays on the map</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-slate-200">Priority countdown alerts and notifications</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              {userId ? (
                status?.type === "DRIVER_GOLD" ? (
                  <button
                    disabled
                    className="w-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 py-4 rounded-full text-xs font-black tracking-widest uppercase select-none"
                  >
                    CURRENT ACTIVE PLAN
                  </button>
                ) : (
                  <button
                    disabled={isUpgrading}
                    onClick={() => handleSimulateUpgrade("DRIVER_GOLD")}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black hover:scale-105 transition-all py-4 rounded-full text-xs font-black tracking-widest uppercase cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
                  >
                    {isUpgrading ? "UPGRADING..." : "SIMULATE GOLD"}
                  </button>
                )
              ) : (
                <SignInButton mode="modal">
                  <button className="w-full bg-amber-500 text-black py-4 rounded-full text-xs font-black tracking-widest uppercase cursor-pointer">
                    SIGN IN TO UPGRADE
                  </button>
                </SignInButton>
              )}
            </div>
          </div>

          {/* Card 3: Owner Pro */}
          <div className="relative bg-gradient-to-b from-primary/10 to-transparent dark:from-primary/5 backdrop-blur-xl border border-primary/30 p-8 rounded-3xl flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 shadow-md">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black tracking-widest text-primary uppercase">OWNER ONLY</span>
                <Building className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-2xl font-black text-foreground mb-1">Business Pro</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-sans mb-6">Maximize parking profits and delegate lot attendant duties.</p>
              
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-black text-primary">NPR 1,999</span>
                <span className="text-xs text-muted-foreground font-sans">/ month</span>
              </div>

              {/* Divider */}
              <div className="h-px bg-primary/20 mb-8" />

              {/* Feature List */}
              <ul className="space-y-4 font-sans text-sm">
                <li className="flex items-start gap-3">
                  <TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-slate-200 font-semibold">Dynamic Surge Pricing configurations</span>
                </li>
                <li className="flex items-start gap-3">
                  <Crown className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-slate-200 font-semibold">Featured placement badges on lot searches</span>
                </li>
                <li className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-slate-200 font-semibold">Attendant multi-staff check-in registers</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-slate-200">Advanced earnings metrics & visual breakdown</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              {userId ? (
                status?.type === "OWNER_PRO" ? (
                  <button
                    disabled
                    className="w-full bg-primary/20 text-primary border border-primary/30 py-4 rounded-full text-xs font-black tracking-widest uppercase select-none"
                  >
                    CURRENT ACTIVE PLAN
                  </button>
                ) : (
                  <button
                    disabled={isUpgrading}
                    onClick={() => handleSimulateUpgrade("OWNER_PRO")}
                    className="w-full bg-primary hover:bg-primary/95 hover:scale-105 text-primary-foreground transition-all py-4 rounded-full text-xs font-black tracking-widest uppercase cursor-pointer shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {isUpgrading ? "UPGRADING..." : "SIMULATE BUSINESS PRO"}
                  </button>
                )
              ) : (
                <SignInButton mode="modal">
                  <button className="w-full bg-primary text-primary-foreground py-4 rounded-full text-xs font-black tracking-widest uppercase cursor-pointer">
                    SIGN IN TO UPGRADE
                  </button>
                </SignInButton>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-black/10 dark:border-white/8 py-6 text-center text-sm text-muted-foreground mt-20">
        <p>© 2026 Parkly Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
