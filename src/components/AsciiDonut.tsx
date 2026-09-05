"use client";

import React, { useEffect, useRef, useState } from "react";

interface AsciiDonutProps {
  isSpinning?: boolean;
  speed?: number;
  className?: string;
  subtle?: boolean;
}

/**
 * Classic Rotating 3D ASCII Donut (Torus Projection)
 * Mathematical torus projection using monospace luminance character ramps (.,-~:;=!*#$@).
 * Respects prefers-reduced-motion and provides rich editorial aesthetic.
 */
export function AsciiDonut({
  isSpinning = true,
  speed = 1.0,
  className = "",
  subtle = false,
}: AsciiDonutProps) {
  const [frame, setFrame] = useState<string>("");
  const animRef = useRef<number | null>(null);
  const aRef = useRef(0);
  const bRef = useRef(0);

  useEffect(() => {
    // Check reduced motion preference
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const screenWidth = 44;
    const screenHeight = 22;
    const thetaSpacing = 0.07;
    const phiSpacing = 0.02;

    const renderFrame = (A: number, B: number): string => {
      const cosA = Math.cos(A);
      const sinA = Math.sin(A);
      const cosB = Math.cos(B);
      const sinB = Math.sin(B);

      const output: string[] = new Array(screenWidth * screenHeight).fill(" ");
      const zBuffer: number[] = new Array(screenWidth * screenHeight).fill(0);

      const R1 = 1; // Cross-section radius
      const R2 = 2; // Distance from center
      const K2 = 5;
      const K1 = (screenWidth * K2 * 3) / (8 * (R1 + R2));

      for (let theta = 0; theta < 6.28; theta += thetaSpacing) {
        const costheta = Math.cos(theta);
        const sintheta = Math.sin(theta);

        for (let phi = 0; phi < 6.28; phi += phiSpacing) {
          const cosphi = Math.cos(phi);
          const sinphi = Math.sin(phi);

          const circlex = R2 + R1 * costheta;
          const circley = R1 * sintheta;

          const x = circlex * (cosB * cosphi + sinA * sinB * sinphi) - circley * cosA * sinB;
          const y = circlex * (sinB * cosphi - sinA * cosB * sinphi) + circley * cosA * cosB;
          const z = K2 + cosA * circlex * sinphi + circley * sinA;
          const ooz = 1 / z;

          const xp = Math.floor(screenWidth / 2 + K1 * ooz * x);
          const yp = Math.floor(screenHeight / 2 - (K1 * ooz * y) / 2);

          // Luminance vector N
          const L =
            cosphi * costheta * sinB -
            cosA * costheta * sinphi -
            sinA * sintheta +
            cosB * (cosA * sintheta - costheta * sinA * sinphi);

          if (L > 0) {
            const idx = xp + yp * screenWidth;
            if (idx >= 0 && idx < screenWidth * screenHeight && ooz > zBuffer[idx]) {
              zBuffer[idx] = ooz;
              const luminanceIdx = Math.floor(L * 8);
              const chars = ".,-~:;=!*#$@";
              output[idx] = chars[Math.min(Math.max(luminanceIdx, 0), chars.length - 1)];
            }
          }
        }
      }

      let result = "";
      for (let i = 0; i < screenHeight; i++) {
        const row = output.slice(i * screenWidth, (i + 1) * screenWidth).join("");
        result += row + "\n";
      }
      return result;
    };

    if (prefersReducedMotion || !isSpinning) {
      setFrame(renderFrame(1.2, 0.8));
      return;
    }

    let lastTime = performance.now();
    const loop = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      aRef.current += 0.7 * speed * delta;
      bRef.current += 0.35 * speed * delta;

      setFrame(renderFrame(aRef.current, bRef.current));
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isSpinning, speed]);

  return (
    <div
      aria-hidden="true"
      className={`select-none font-mono text-[9px] sm:text-[10.5px] leading-[10px] sm:leading-[11.5px] tracking-tight whitespace-pre text-center ${
        subtle ? "text-text-muted/60" : "text-accent/85 dark:text-accent/90"
      } ${className}`}
    >
      {frame}
    </div>
  );
}
