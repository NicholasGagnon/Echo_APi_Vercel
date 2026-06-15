"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation"; // 🎯 Import pour la redirection

type PremiumBannerProps = {
  currentTier?: string;
};

export default function PremiumBanner({ currentTier: _currentTier }: PremiumBannerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter(); // 🎯 Initialisation du routeur

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = containerRef.current?.offsetWidth || 1050);
    const getBannerHeight = () => (window.innerWidth < 640 ? 76 : window.innerWidth < 1024 ? 96 : 122);
    let height = (canvas.height = getBannerHeight());

    const handleResize = () => {
      width = canvas.width = containerRef.current?.offsetWidth || 1050;
      height = canvas.height = getBannerHeight();
    };
    window.addEventListener("resize", handleResize);

    const cubes: Array<{
      x: number;
      y: number;
      size: number;
      speedY: number;
      opacity: number;
      pulseSpeed: number;
    }> = [];

    for (let i = 0; i < 25; i++) {
      cubes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 12 + 5, // Légèrement réduits pour fitter le format mince
        speedY: -(Math.random() * 0.22 + 0.05),
        opacity: Math.random() * 0.6 + 0.2,
        pulseSpeed: Math.random() * 0.012 + 0.004,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      cubes.forEach((cube) => {
        cube.y += cube.speedY;
        cube.opacity += cube.pulseSpeed;

        if (cube.opacity > 0.75 || cube.opacity < 0.15) {
          cube.pulseSpeed = -cube.pulseSpeed;
        }

        if (cube.y < -cube.size) {
          cube.y = height + cube.size;
          cube.x = Math.random() * width;
        }

        ctx.strokeStyle = `rgba(6, 182, 212, ${cube.opacity})`;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(cube.x, cube.y, cube.size, cube.size);

        ctx.fillStyle = `rgba(6, 182, 212, ${cube.opacity * 0.4})`;
        ctx.fillRect(cube.x, cube.y, 2, 2);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <header
      ref={containerRef}
      className="w-full border-b border-zinc-800 bg-black pb-2 sm:pb-3 relative shrink-0"
    >
      {/* 🎯 Ajout du clic, du curseur pointeur et des effets de feedback visuel */}
      <div 
        onClick={() => router.push("/services")}
        className="relative w-full h-[76px] sm:h-[96px] lg:h-[122px] rounded-md overflow-hidden border border-zinc-800 bg-zinc-950 cursor-pointer transition-all duration-200 hover:opacity-90 active:scale-[0.995]"
      >

        {/* IMAGE DE FOND ACCENTUÉE AU CENTRE */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/banner44.png"
            alt="Echo Framework Banner"
            fill
            sizes="(max-width: 1550px) 100vw, 1550px"
            className="object-cover object-center" // Recadre et centre au pixel près
            priority
          />
        </div>

        {/* CANVAS CUBES PAR DESSUS */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-10 pointer-events-none"
        />
      </div>
    </header>
  );
}
