"use client";

import { useEffect, useRef, useState } from "react";

import { PLAYER_COLORS } from "@/features/ladder/constants";
import {
  buildPathD,
  colX,
  rungSegments,
  type LadderGeometry,
} from "@/features/ladder/ladder-geometry";
import type { LadderPath, Rung } from "@/features/ladder/ladder-engine";

interface LadderCanvasProps {
  rungs: readonly Rung[];
  geom: LadderGeometry;
  activePath: LadderPath | null;
  ghostPaths?: readonly LadderPath[];
  animating: boolean;
  onAnimationEnd?: () => void;
}

export function LadderCanvas({
  rungs,
  geom,
  activePath,
  ghostPaths = [],
  animating,
  onAnimationEnd,
}: LadderCanvasProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const [dot, setDot] = useState<{ x: number; y: number } | null>(null);
  const pathD = activePath ? buildPathD(activePath, geom) : "";
  const color = activePath
    ? PLAYER_COLORS[activePath.startCol % PLAYER_COLORS.length]
    : PLAYER_COLORS[0];

  useEffect(() => {
    const node = pathRef.current;
    if (!node || !activePath) {
      setDot(null);
      return;
    }

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const length = node.getTotalLength();
    if (!animating || reduceMotion || length === 0) {
      node.style.strokeDasharray = "none";
      node.style.strokeDashoffset = "0";
      const end = node.getPointAtLength(length);
      setDot({ x: end.x, y: end.y });
      if (animating) onAnimationEnd?.();
      return;
    }

    node.style.strokeDasharray = `${length}`;
    node.style.strokeDashoffset = `${length}`;
    const duration = Math.min(2600, 900 + length * 1.1);
    const started = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - (1 - t) ** 3;
      node.style.strokeDashoffset = `${length * (1 - eased)}`;
      const pt = node.getPointAtLength(length * eased);
      setDot({ x: pt.x, y: pt.y });
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        onAnimationEnd?.();
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [activePath, animating, pathD, onAnimationEnd]);

  return (
    <svg
      role="img"
      aria-label="12명 사다리"
      viewBox={`0 0 ${geom.width} ${geom.height}`}
      width={geom.width}
      height={geom.height}
      className="mx-auto block"
    >
      <defs>
        <filter id="ladder-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {Array.from({ length: geom.players }, (_, col) => (
        <line
          key={`v-${col}`}
          x1={colX(geom, col)}
          y1={geom.startY}
          x2={colX(geom, col)}
          y2={geom.endY}
          stroke="currentColor"
          className="text-slate-custom-400 dark:text-slate-custom-500"
          strokeWidth={3}
          strokeLinecap="round"
        />
      ))}

      {rungSegments(rungs, geom).map((seg) => (
        <line
          key={seg.key}
          x1={seg.x1}
          y1={seg.y}
          x2={seg.x2}
          y2={seg.y}
          stroke="currentColor"
          className="text-slate-custom-400 dark:text-slate-custom-500"
          strokeWidth={3}
          strokeLinecap="round"
        />
      ))}

      {ghostPaths.map((path) => (
        <path
          key={`ghost-${path.startCol}`}
          d={buildPathD(path, geom)}
          fill="none"
          stroke={PLAYER_COLORS[path.startCol % PLAYER_COLORS.length]}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.28}
        />
      ))}

      {activePath && (
        <path
          ref={pathRef}
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#ladder-glow)"
        />
      )}

      {dot && (
        <circle
          cx={dot.x}
          cy={dot.y}
          r={7}
          fill={color}
          stroke="white"
          strokeWidth={2}
        />
      )}
    </svg>
  );
}
