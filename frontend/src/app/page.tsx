"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { gsap } from "gsap";
import { useTheme } from "next-themes";
import { ThemeToggle } from "@/components/theme-toggle";
import { Show, SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { useGetOwnerAnalyticsQuery } from "@/store/apiSlice";

export default function Home() {
  const { isLoaded, userId } = useAuth();
  const { data: analytics } = useGetOwnerAnalyticsQuery(undefined, {
    skip: !isLoaded || !userId,
  });
  const isOwner = analytics && analytics.totalGarages > 0;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  // Three.js object references for theme reactivity
  const sceneRef = useRef<THREE.Scene | null>(null);
  const roadMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const dividerMatRef = useRef<THREE.MeshStandardMaterial | null>(null);

  // Avoid hydration issues by checking if component is mounted
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Three.js Engine Lifecycle
  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // --- THREE.JS ENGINE ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const isDark = resolvedTheme === "dark";
    const initialBgColor = isDark ? 0x02040a : 0xf8fafc;
    scene.background = new THREE.Color(initialBgColor);
    scene.fog = new THREE.Fog(initialBgColor, 15, 75);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(10, 20, 10);
    scene.add(sun);

    // --- CAR FACTORY (Golf Style) ---
    interface CarObject {
      mesh: THREE.Group;
      wheels: THREE.Mesh[];
      speed: number;
      isFarLane: boolean;
    }

    function createGolfCar(color: number): { mesh: THREE.Group; wheels: THREE.Mesh[] } {
      const car = new THREE.Group();

      const bodyGeo = new THREE.BoxGeometry(2.4, 0.65, 1.2);
      const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.6 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.5;
      car.add(body);

      const cabinGeo = new THREE.BoxGeometry(1.5, 0.5, 1.05);
      const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a });
      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.set(-0.15, 1.0, 0);
      car.add(cabin);

      const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.4, 16);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
      const wheels: THREE.Mesh[] = [];
      const wheelPositions = [
        [0.8, 0.3, 0.6],
        [0.8, 0.3, -0.6],
        [-0.8, 0.3, 0.6],
        [-0.8, 0.3, -0.6]
      ];
      wheelPositions.forEach(p => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(p[0], p[1], p[2]);
        car.add(w);
        wheels.push(w);
      });

      // Lights
      const hLightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2 });
      const h1 = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), hLightMat);
      h1.position.set(1.21, 0.55, 0.35);
      h1.rotation.y = Math.PI / 2;
      car.add(h1);

      const h2 = h1.clone();
      h2.position.z = -0.35;
      car.add(h2);

      const tLightMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 2 });
      const t1 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), tLightMat);
      t1.position.set(-1.21, 0.6, 0.4);
      t1.rotation.y = -Math.PI / 2;
      car.add(t1);

      const t2 = t1.clone();
      t2.position.z = -0.4;
      car.add(t2);

      return { mesh: car, wheels };
    }

    // --- ENVIRONMENT ---
    const initialRoadColor = isDark ? 0x080c14 : 0x0f172a;
    const roadGeo = new THREE.PlaneGeometry(1000, 20);
    const roadMat = new THREE.MeshStandardMaterial({ color: initialRoadColor });
    roadMatRef.current = roadMat;
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    scene.add(road);

    // Center lane divider & Side shoulder lines to define the track
    const grid = new THREE.Group();
    const initialDividerColor = isDark ? 0x10b981 : 0x059669;
    const dividerGeo = new THREE.PlaneGeometry(4, 0.2);
    const dividerMat = new THREE.MeshStandardMaterial({
      color: initialDividerColor,
      emissive: initialDividerColor,
      emissiveIntensity: isDark ? 0.5 : 0.2
    });
    dividerMatRef.current = dividerMat;

    for (let i = -100; i < 100; i++) {
      const line = new THREE.Mesh(dividerGeo, dividerMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(i * 12, 0.05, 0);
      grid.add(line);
    }

    const sideLineGeo = new THREE.PlaneGeometry(1000, 0.15);
    const leftLine = new THREE.Mesh(sideLineGeo, dividerMat);
    leftLine.rotation.x = -Math.PI / 2;
    leftLine.position.set(0, 0.02, -9.8);
    grid.add(leftLine);

    const rightLine = new THREE.Mesh(sideLineGeo, dividerMat);
    rightLine.rotation.x = -Math.PI / 2;
    rightLine.position.set(0, 0.02, 9.8);
    grid.add(rightLine);

    scene.add(grid);

    // --- COLLISION-FREE TRAFFIC SYSTEM ---
    const fleet: CarObject[] = [];
    const colors = [0xd1d5db, 0xffffff, 0x10b981, 0x94a3b8];
    const numCarsPerLane = 6;
    const totalDistance = 120; // Total length of the "track"
    const spacing = totalDistance / numCarsPerLane; // Fixed spacing

    for (let i = 0; i < numCarsPerLane * 2; i++) {
      const isFarLane = i < numCarsPerLane;
      const carObj = createGolfCar(colors[i % 4]);

      // Fixed logic: Every car in the same lane has the EXACT same speed
      const speed = isFarLane ? -0.15 : 0.15;
      const laneZ = isFarLane ? -4.5 : 4.5;

      // Calculate fixed starting position to prevent overlap
      const startX = ((i % numCarsPerLane) * spacing) - (totalDistance / 2);

      carObj.mesh.position.set(startX, 0, laneZ);
      carObj.mesh.rotation.y = isFarLane ? Math.PI : 0;

      scene.add(carObj.mesh);
      fleet.push({ ...carObj, speed, isFarLane });
    }

    // --- ANIMATION ---
    camera.position.set(22, 12, 25);
    camera.lookAt(0, 0, 0);

    let mouseX = 0, mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) - 0.5;
      mouseY = (e.clientY / window.innerHeight) - 0.5;
    };
    window.addEventListener("mousemove", handleMouseMove);

    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      fleet.forEach(car => {
        car.mesh.position.x += car.speed;
        car.wheels.forEach(w => w.rotation.x += Math.abs(car.speed) * 4);

        // Loop teleport logic
        const limit = totalDistance / 2;
        if (car.speed > 0 && car.mesh.position.x > limit) car.mesh.position.x = -limit;
        if (car.speed < 0 && car.mesh.position.x < -limit) car.mesh.position.x = limit;
      });

      // Camera Motion
      const tx = 22 + (mouseX * 18);
      const ty = 12 + (mouseY * 10);
      camera.position.x += (tx - camera.position.x) * 0.05;
      camera.position.y += (ty - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);

      scene.remove(road);
      roadGeo.dispose();
      roadMat.dispose();

      scene.remove(grid);
      dividerGeo.dispose();
      dividerMat.dispose();
      sideLineGeo.dispose();
      grid.clear();

      fleet.forEach(car => {
        scene.remove(car.mesh);
        car.mesh.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach((mat) => mat.dispose());
              } else {
                object.material.dispose();
              }
            }
          }
        });
      });

      renderer.dispose();
    };
  }, [mounted]);

  // React to theme changes
  useEffect(() => {
    if (!sceneRef.current || !roadMatRef.current || !dividerMatRef.current) return;
    const isDark = resolvedTheme === "dark";
    const bgColor = isDark ? 0x02040a : 0xf8fafc;
    const roadColor = isDark ? 0x080c14 : 0x0f172a;
    const dividerColor = isDark ? 0x10b981 : 0x059669;

    sceneRef.current.background = new THREE.Color(bgColor);
    if (sceneRef.current.fog) {
      sceneRef.current.fog.color = new THREE.Color(bgColor);
    }
    roadMatRef.current.color.setHex(roadColor);
    dividerMatRef.current.color.setHex(dividerColor);
    dividerMatRef.current.emissive.setHex(dividerColor);
    dividerMatRef.current.emissiveIntensity = isDark ? 0.5 : 0.2;
  }, [resolvedTheme]);

  // GSAP Entrance Animations
  useEffect(() => {
    if (!mounted || !containerRef.current) return;
    const reveals = containerRef.current.querySelectorAll(".text-reveal");

    gsap.to(reveals, {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      duration: 1.5,
      stagger: 0.15,
      ease: "expo.out",
      delay: 0.3
    });
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-background text-foreground overflow-x-hidden" ref={containerRef}>
      {/* 3D WebGL Canvas fixed in background */}
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full z-0 outline-none" id="world" />

      {/* UI Content Layer */}
      <div className="relative z-10 pointer-events-none flex flex-col min-h-screen w-full">
        {/* Navigation */}
        <nav className="flex justify-between items-center px-6 md:px-12 py-8 md:py-10 pointer-events-auto">
          <div className="text-xl md:text-2xl font-black flex items-center gap-3 tracking-tighter text-foreground select-none">
            <img src="/logo.png" alt="Parkly Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain" />
            PARK<span className="text-primary">LY</span>
          </div>

          <div className="flex items-center gap-4 md:gap-12">
            <div className="hidden md:flex gap-12">
              <Link href="/subscription" className="text-[0.7rem] tracking-[0.2em] font-extrabold text-muted-foreground hover:text-primary transition-colors">
                PRICING
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="bg-white/5 dark:bg-white/2 backdrop-blur-2xl border border-black/10 dark:border-white/8 px-6 md:px-8 py-2.5 md:py-3 rounded-full text-[9px] md:text-[10px] font-black tracking-[0.2em] hover:bg-black/5 dark:hover:bg-white/5 transition text-foreground cursor-pointer">
                    SIGN IN
                  </button>
                </SignInButton>
              </Show>
              <Show when="signed-in">
                {/* <Link
                  href="/search"
                  className="bg-white/5 dark:bg-white/2 backdrop-blur-2xl border border-black/10 dark:border-white/8 px-6 md:px-8 py-2.5 md:py-3 rounded-full text-[9px] md:text-[10px] font-black tracking-[0.2em] hover:bg-black/5 dark:hover:bg-white/5 transition text-foreground cursor-pointer"
                >
                  DASHBOARD
                </Link> */}
                <Link
                  href="/bookings"
                  className="bg-white/5 dark:bg-white/2 backdrop-blur-2xl border border-black/10 dark:border-white/8 px-6 md:px-8 py-2.5 md:py-3 rounded-full text-[9px] md:text-[10px] font-black tracking-[0.2em] hover:bg-black/5 dark:hover:bg-white/5 transition text-foreground cursor-pointer"
                >
                  MY BOOKINGS
                </Link>
                {isOwner && (
                  <Link
                    href="/owner/analytics"
                    className="bg-white/5 dark:bg-white/2 backdrop-blur-2xl border border-black/10 dark:border-white/8 px-6 md:px-8 py-2.5 md:py-3 rounded-full text-[9px] md:text-[10px] font-black tracking-[0.2em] hover:bg-black/5 dark:hover:bg-white/5 transition text-foreground cursor-pointer"
                  >
                    OWNER DASHBOARD
                  </Link>
                )}
                <UserButton />
              </Show>
            </div>
          </div>
        </nav>

        {/* Hero & Main Body */}
        <main className="flex-grow flex flex-col justify-center px-6 md:px-12 py-16 md:py-24">
          <div className="max-w-4xl w-full">
            {/* Tagline Badge */}


            {/* Main Header */}
            <h1 className="text-reveal text-5xl md:text-[7rem] font-black mb-6 md:mb-8 leading-[0.9] md:leading-[0.8] tracking-tighter opacity-0 translate-y-[30px] blur-[8px] text-foreground">
              SMART PARKING, <br className="hidden md:block" /> <span className="text-primary">EFFORTLESS.</span>
            </h1>

            {/* Subtitle Description */}
            <p className="text-reveal text-slate-600 dark:text-slate-400 text-base md:text-xl max-w-xl mb-8 md:mb-12 leading-relaxed opacity-0 translate-y-[30px] blur-[8px] font-sans">
              Find and book compatible spots in seconds. Enforce timers, check routes, and pay securely.
            </p>

            {/* Call To Actions */}
            <div className="text-reveal flex flex-wrap items-center gap-4 md:gap-6 pointer-events-auto opacity-0 translate-y-[30px] blur-[8px]">
              <Link
                href="/search"
                className="bg-primary text-primary-foreground px-8 py-4 md:px-10 md:py-5 rounded-full font-black text-sm md:text-base shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all duration-400 hover:scale-105 hover:shadow-[0_15px_40px_rgba(16,185,129,0.5)] ease-[cubic-bezier(0.175,0.885,0.32,1.275)] flex items-center justify-center"
              >
                FIND A SPOT
              </Link>
              <Link
                href="/owner/new-garage"
                className="bg-slate-50/80 dark:bg-white/2 backdrop-blur-2xl border border-slate-200 dark:border-white/8 text-foreground px-8 py-4 md:px-10 md:py-5 rounded-full font-black text-sm md:text-base transition-all duration-400 hover:scale-105 hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center shadow-sm"
              >
                REGISTER GARAGE
              </Link>

              <div className="flex items-center gap-3 ml-2 select-none">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </span>
              </div>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mt-20 md:mt-24 pointer-events-auto">
              {/* Card 1 */}
              <div className="text-reveal bg-slate-50/80 dark:bg-white/2 backdrop-blur-xl border border-slate-200 dark:border-white/8 p-8 rounded-2xl opacity-0 translate-y-[30px] blur-[8px] transition-all hover:bg-slate-100/80 dark:hover:bg-white/5 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 font-black">01</div>
                  <h3 className="text-lg font-bold text-foreground">AI-Powered Space Finder</h3>
                  <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm leading-relaxed font-sans">
                    Use natural language queries to immediately locate nearby bike, EV, SUV, or standard parking spaces.
                  </p>
                </div>
              </div>
              {/* Card 2 */}
              <div className="text-reveal bg-slate-50/80 dark:bg-white/2 backdrop-blur-xl border border-slate-200 dark:border-white/8 p-8 rounded-2xl opacity-0 translate-y-[30px] blur-[8px] transition-all hover:bg-slate-100/80 dark:hover:bg-white/5 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 font-black">02</div>
                  <h3 className="text-lg font-bold text-foreground">Smart Reservation Locks</h3>
                  <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm leading-relaxed font-sans">
                    Secure your booking instantly within a few seconds.
                  </p>
                </div>
              </div>
              {/* Card 3 */}
              <div className="text-reveal bg-slate-50/80 dark:bg-white/2 backdrop-blur-xl border border-slate-200 dark:border-white/8 p-8 rounded-2xl opacity-0 translate-y-[30px] blur-[8px] transition-all hover:bg-slate-100/80 dark:hover:bg-white/5 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 font-black">03</div>
                  <h3 className="text-lg font-bold text-foreground">Precision Route Guidance</h3>
                  <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm leading-relaxed font-sans">
                    Navigate smoothly with live-updating map routing showing the shortest path and exact ETA to your spot.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-black/10 dark:border-white/8 py-6 px-6 text-center text-sm text-muted-foreground pointer-events-auto">
          <p>© 2026 Parkly Inc. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
