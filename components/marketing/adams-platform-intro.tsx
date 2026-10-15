"use client";

import { motion } from "framer-motion";

type Pt = { x: number; y: number };

const mulberry32 = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
};

/** Midpoint-displacement lightning between two points. Point count depends only on `detail`. */
function jagged(a: Pt, b: Pt, rng: () => number, displace: number, detail: number): Pt[] {
  let pts: Pt[] = [a, b];
  let offset = displace;
  for (let i = 0; i < detail; i++) {
    const next: Pt[] = [];
    for (let j = 0; j < pts.length - 1; j++) {
      const p = pts[j];
      const q = pts[j + 1];
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      const k = (rng() - 0.5) * offset;
      next.push(p, { x: (p.x + q.x) / 2 + (-dy / len) * k, y: (p.y + q.y) / 2 + (dx / len) * k });
    }
    next.push(pts[pts.length - 1]);
    pts = next;
    offset *= 0.55;
  }
  return pts;
}

const toD = (pts: Pt[]) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

/** Several same-topology variants of one bolt so Framer can morph `d` between them. */
export function boltVariants(a: Pt, b: Pt, seed: number, displace: number, detail = 4, count = 3) {
  const rng = mulberry32(seed);
  const variants = Array.from({ length: count }, () => toD(jagged(a, b, rng, displace, detail)));
  return [...variants, variants[0]];
}

interface BoltProps {
  variants: string[];
  color?: string;
  width?: number;
  delay?: number;
  duration?: number;
  repeatDelay?: number;
  pathLength?: boolean;
}

export function Bolt({
  variants,
  color = "#5ad8ff",
  width = 2,
  delay = 0,
  duration = 0.45,
  repeatDelay = 0.5,
  pathLength = false,
}: BoltProps) {
  const flicker = {
    opacity: [0, 1, 0.45, 1, 0.7, 0],
    ...(pathLength ? { pathLength: [0, 1, 1, 1, 1, 1] } : {}),
  };
  const times = [0, 0.12, 0.3, 0.5, 0.75, 1];
  const morph = { d: variants };
  const morphT = { duration: 0.32, repeat: Infinity, ease: "linear" as const };
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: flicker.opacity }}
      transition={{ duration, delay, repeat: Infinity, repeatDelay, times }}
      filter="url(#glow)"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <motion.path
        d={variants[0]}
        animate={{ ...morph, ...(pathLength ? { pathLength: [0, 1] } : {}) }}
        transition={pathLength ? { ...morphT, pathLength: { duration: duration * 0.4, delay } } : morphT}
        stroke={color}
        strokeOpacity={0.28}
        strokeWidth={width * 5}
      />
      <motion.path d={variants[0]} animate={morph} transition={morphT} stroke={color} strokeOpacity={0.8} strokeWidth={width * 1.8} />
      <motion.path d={variants[0]} animate={morph} transition={morphT} stroke="#ffffff" strokeWidth={width * 0.8} />
    </motion.g>
  );
}

export function Defs() {
  return (
    <defs>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3.5" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="softglow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="10" />
      </filter>
      <radialGradient id="redglow">
        <stop offset="0%" stopColor="#ff5a6e" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#ff5a6e" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="cyanglow">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
        <stop offset="30%" stopColor="#5ad8ff" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#5ad8ff" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1a2a46" stopOpacity="0.95" />
        <stop offset="60%" stopColor="#0a1220" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#05070d" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="building" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#1b2740" />
        <stop offset="100%" stopColor="#0b1120" />
      </linearGradient>
      <linearGradient id="rack" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#101a2a" />
        <stop offset="100%" stopColor="#070c16" />
      </linearGradient>
      <radialGradient id="dcfog" cx="0.5" cy="0.45" r="0.7">
        <stop offset="0%" stopColor="#2a7ad8" stopOpacity="0.55" />
        <stop offset="35%" stopColor="#0c1f3c" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#03050a" stopOpacity="0.95" />
      </radialGradient>
    </defs>
  );
}

// ---------------------------------------------------------------------------
// Scene 1: Healthcare
// ---------------------------------------------------------------------------

const HOSPITAL = { x: 330, y: 220, w: 340, h: 220, tx: 450, ty: 150, tw: 100, th: 70, ground: 440 };
const WIRE_D = "M -20 248 Q 20 268 60 235 Q 130 262 200 225 Q 268 252 336 220";

function ecg(u: number) {
  const g = (c: number, w: number, h: number) => h * Math.exp(-((u - c) ** 2) / (2 * w * w));
  return g(0.18, 0.025, 0.12) - g(0.36, 0.012, 0.08) + g(0.4, 0.011, 1) - g(0.44, 0.012, 0.26) + g(0.62, 0.04, 0.22);
}
const ECG_D = toD(
  Array.from({ length: 180 }, (_, i) => {
    const f = i / 179;
    return { x: 732 + 216 * f, y: 292 - ecg((f * 2) % 1) * 46 };
  }),
);

const HOSPITAL_BOLTS = [
  boltVariants({ x: 336, y: 220 }, { x: 500, y: 180 }, 101, 28),
  boltVariants({ x: 360, y: 250 }, { x: 640, y: 420 }, 102, 34),
  boltVariants({ x: 670, y: 280 }, { x: 722, y: 275 }, 103, 18),
];

export function HealthcareScene() {
  const { x, y, w, h, tx, ty, tw, th, ground } = HOSPITAL;
  const cols = 12;
  const rows = 5;
  const ww = w / cols;
  const wh = h / 6.2;
  return (
    <svg viewBox="0 0 1000 600" className="h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <Defs />
      <rect x="0" y={ground} width="1000" height={600 - ground} fill="url(#ground)" />
      <motion.ellipse
        cx={x + w / 2}
        cy={ground}
        rx={380}
        ry={120}
        fill="#3b82f6"
        filter="url(#softglow)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.18 }}
        transition={{ delay: 1.2, duration: 1.2 }}
      />

      {/* Power poles and transmission line */}
      {[60, 200].map((px, i) => (
        <g key={px}>
          <rect x={px - 3} y={235 - i * 10} width="6" height={ground - 235 + i * 10} fill="#1a2232" />
          <rect x={px - 24} y={237 - i * 10} width="48" height="4" fill="#1a2232" />
          <rect x={px - 22} y={232 - i * 10} width="4" height="5" fill="#9fb6d8" opacity="0.6" />
          <rect x={px + 18} y={232 - i * 10} width="4" height="5" fill="#9fb6d8" opacity="0.6" />
        </g>
      ))}
      <path d={WIRE_D} stroke="#8fa3c4" strokeWidth="1.3" strokeOpacity="0.5" fill="none" />
      <motion.path
        d={WIRE_D}
        stroke="#5ad8ff"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        filter="url(#glow)"
        initial={{ pathLength: 0.12, pathOffset: 0, opacity: 0 }}
        animate={{ pathOffset: [0, 0.88], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.5, delay: 0.15, ease: "easeInOut", times: [0, 0.1, 0.9, 1] }}
      />
      <motion.path
        d={WIRE_D}
        stroke="#ffffff"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0.1, pathOffset: 0, opacity: 0 }}
        animate={{ pathOffset: [0, 0.9], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.5, delay: 0.15, ease: "easeInOut", times: [0, 0.1, 0.9, 1] }}
      />

      {/* Hospital */}
      <rect x={x} y={y} width={w} height={h} fill="url(#building)" stroke="#a9c3ff" strokeOpacity="0.25" />
      <rect x={tx} y={ty} width={tw} height={th} fill="#141d2f" stroke="#a9c3ff" strokeOpacity="0.25" />
      <rect x={x - 4} y={y} width={w + 8} height="4" fill="#c8dcff" opacity="0.2" />
      <rect x={tx - 3} y={ty} width={tw + 6} height="3" fill="#c8dcff" opacity="0.2" />
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const warm = (c * 7 + r * 3) % 5 === 0;
          return (
            <motion.rect
              key={`${r}-${c}`}
              x={x + ww * (c + 0.25)}
              y={y + wh * (r + 0.55)}
              width={ww * 0.5}
              height={wh * 0.55}
              fill={warm ? "#ffd6a0" : "#bee0ff"}
              initial={{ opacity: 0.08 }}
              animate={{ opacity: [0.08, 0.95, 0.75, 0.9] }}
              transition={{ delay: 1.1 + c * 0.075 + r * 0.02, duration: 0.6, times: [0, 0.3, 0.6, 1] }}
            />
          );
        }),
      )}
      {[0, 1, 2].map((c) => (
        <motion.rect
          key={c}
          x={tx + tw * (0.15 + c * 0.28)}
          y={ty + th * 0.55}
          width={tw * 0.16}
          height={th * 0.25}
          fill="#bee0ff"
          initial={{ opacity: 0.08 }}
          animate={{ opacity: 0.9 }}
          transition={{ delay: 1.7, duration: 0.5 }}
        />
      ))}

      {/* Cross */}
      <motion.circle cx={500} cy={180} r="60" fill="url(#redglow)" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.8, 1] }} transition={{ delay: 1.85, duration: 1.2 }} />
      <motion.g initial={{ opacity: 0.35 }} animate={{ opacity: 1 }} transition={{ delay: 1.85, duration: 0.4 }} fill="#ff4d60">
        <rect x={500 - 18} y={180 - 6} width="36" height="12" />
        <rect x={500 - 6} y={180 - 18} width="12" height="36" />
      </motion.g>

      {/* Entrance */}
      <rect x={x + w / 2 - 62} y={ground - 66} width="124" height="6" fill="#1c2a44" />
      <motion.rect x={x + w / 2 - 54} y={ground - 58} width="108" height="5" fill="#ff3c3c" initial={{ opacity: 0.3 }} animate={{ opacity: 0.95 }} transition={{ delay: 1.9, duration: 0.4 }} />
      <motion.text
        x={x + w / 2}
        y={ground - 55.5}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="6.5"
        fontWeight="700"
        fill="#ffffff"
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.9, duration: 0.4 }}
      >
        EMERGENCY
      </motion.text>
      <motion.rect x={x + w / 2 - 22} y={ground - 50} width="44" height="50" fill="#c8e6ff" initial={{ opacity: 0.12 }} animate={{ opacity: 0.55 }} transition={{ delay: 1.95, duration: 0.5 }} />

      {/* Patient monitor */}
      <motion.g initial={{ opacity: 0.25 }} animate={{ opacity: 1 }} transition={{ delay: 2.05, duration: 0.5 }}>
        <rect x="720" y="200" width="240" height="150" rx="10" fill="#070b12" stroke="#7896c8" strokeOpacity="0.45" strokeWidth="1.5" />
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={`v${i}`} x1={720 + (240 * (i + 1)) / 8} y1="208" x2={720 + (240 * (i + 1)) / 8} y2="342" stroke="#2a6e50" strokeOpacity="0.35" strokeWidth="0.6" />
        ))}
        {Array.from({ length: 4 }).map((_, i) => (
          <line key={`h${i}`} x1="728" y1={200 + (150 * (i + 1)) / 5} x2="952" y2={200 + (150 * (i + 1)) / 5} stroke="#2a6e50" strokeOpacity="0.35" strokeWidth="0.6" />
        ))}
        <motion.path
          d={ECG_D}
          fill="none"
          stroke="#3cff8c"
          strokeWidth="1.8"
          strokeLinecap="round"
          filter="url(#glow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1], opacity: [0, 1, 1, 0.2] }}
          transition={{ delay: 2.1, duration: 1.7, repeat: Infinity, ease: "linear", times: [0, 0.05, 0.9, 1] }}
        />
        <text x="734" y="212" fontSize="24" fontWeight="700" fill="#3cff8c" dominantBaseline="hanging" fontFamily="ui-monospace, monospace">
          72
        </text>
        <text x="770" y="216" fontSize="10" fontWeight="600" fill="#96e6b4" dominantBaseline="hanging">
          BPM
        </text>
        <text x="946" y="214" fontSize="10" fontWeight="600" fill="#6ebeff" dominantBaseline="hanging" textAnchor="end">
          SpO₂ 98%
        </text>
        <text x="946" y="229" fontSize="10" fontWeight="600" fill="#ffc878" dominantBaseline="hanging" textAnchor="end">
          NIBP 118/76
        </text>
      </motion.g>

      <Bolt variants={HOSPITAL_BOLTS[0]} delay={1.75} repeatDelay={0.9} />
      <Bolt variants={HOSPITAL_BOLTS[1]} color="#78aaff" width={1.4} delay={2.1} repeatDelay={1.1} />
      <Bolt variants={HOSPITAL_BOLTS[2]} color="#3cff8c" width={1.4} delay={2.3} repeatDelay={0.8} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Scene 2: Data center
// ---------------------------------------------------------------------------

const VP = { x: 500, y: 270 };
const NEAR_FLOOR = 610;
const AISLE_HALF = 170;
const RACK_H = 300;
const sOf = (k: number) => 1 / (1 + k * 5.5);
const floorY = (k: number) => VP.y + (NEAR_FLOOR - VP.y) * sOf(k);
const ceilY = (k: number) => VP.y - (NEAR_FLOOR - VP.y) * 0.75 * sOf(k);
const xL = (k: number) => VP.x - AISLE_HALF * sOf(k);
const xR = (k: number) => VP.x + AISLE_HALF * sOf(k);

const RACKS = Array.from({ length: 8 }, (_, i) => {
  const k0 = i * 0.14;
  const k1 = k0 + 0.13;
  return { i, k0, k1, kMid: (k0 + k1) / 2 };
}).reverse();

const BUS_BOLT = boltVariants({ x: VP.x, y: VP.y }, { x: VP.x, y: ceilY(0) }, 201, 26, 5);
const DC_ARCS = [0.05, 0.22, 0.42, 0.65].flatMap((k, i) => [
  { v: boltVariants({ x: VP.x, y: ceilY(k) }, { x: xL(k), y: floorY(k) - RACK_H * sOf(k) }, 300 + i, 22 * sOf(k) + 8), k },
  { v: boltVariants({ x: VP.x, y: ceilY(k) }, { x: xR(k), y: floorY(k) - RACK_H * sOf(k) }, 320 + i, 22 * sOf(k) + 8), k },
]);

export function DataCenterScene() {
  return (
    <svg viewBox="0 0 1000 600" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <Defs />
      <rect x="0" y="0" width="1000" height="600" fill="url(#dcfog)" />
      <motion.circle cx={VP.x} cy={VP.y} r="220" fill="#3b82f6" filter="url(#softglow)" initial={{ opacity: 0 }} animate={{ opacity: 0.35 }} transition={{ delay: 0.3, duration: 1.4 }} />

      {/* Floor grid */}
      {[-3, -2, -1, 0, 1, 2, 3].map((i) => (
        <line key={`l${i}`} x1={VP.x} y1={VP.y} x2={VP.x + (AISLE_HALF * 0.9 * i) / 3} y2={NEAR_FLOOR} stroke="#78aae6" strokeOpacity="0.14" />
      ))}
      {Array.from({ length: 15 }, (_, i) => i * 0.08).map((k) => (
        <line key={`t${k}`} x1={xL(k)} y1={floorY(k)} x2={xR(k)} y2={floorY(k)} stroke="#78aae6" strokeOpacity={0.16 * sOf(k)} />
      ))}
      {[-0.18, 0, 0.18].map((off) => (
        <line key={`c${off}`} x1={VP.x} y1={VP.y} x2={VP.x + AISLE_HALF * off * 2.4} y2={ceilY(0) - 20} stroke="#5a78aa" strokeOpacity="0.25" strokeWidth="2" />
      ))}

      {/* Racks */}
      {RACKS.map(({ i, k0, k1, kMid }) =>
        [-1, 1].map((side) => {
          const x0 = side < 0 ? xL(k0) : xR(k0);
          const x1 = side < 0 ? xL(k1) : xR(k1);
          const f0 = floorY(k0);
          const f1 = floorY(k1);
          const t0 = f0 - RACK_H * sOf(k0);
          const t1 = f1 - RACK_H * sOf(k1);
          const litDelay = 0.55 + kMid * 1.5;
          const units = 6;
          return (
            <g key={`${i}-${side}`}>
              <polygon points={`${x0},${f0} ${x1},${f1} ${x1},${t1} ${x0},${t0}`} fill="url(#rack)" stroke="#96b4dc" strokeOpacity={0.3 * sOf(k0) + 0.1} />
              {Array.from({ length: units }).map((_, u) => {
                const vA = 0.08 + (u / units) * 0.86;
                const vB = vA + 0.1;
                const ya0 = t0 + (f0 - t0) * vA;
                const ya1 = t1 + (f1 - t1) * vA;
                const yb0 = t0 + (f0 - t0) * vB;
                const yb1 = t1 + (f1 - t1) * vB;
                return (
                  <g key={u}>
                    <polygon points={`${x0},${ya0} ${x1},${ya1} ${x1},${yb1} ${x0},${yb0}`} fill="#283750" fillOpacity="0.55" />
                    {[0.3, 0.7].map((fx, l) => {
                      const lx = x0 + (x1 - x0) * fx;
                      const ly = (ya0 + yb0) / 2 + ((ya1 + yb1) / 2 - (ya0 + yb0) / 2) * fx;
                      const green = (u + l + i) % 3 !== 0;
                      return (
                        <motion.circle
                          key={l}
                          cx={lx}
                          cy={ly}
                          r={Math.max(0.8, 2.4 * sOf(k0))}
                          fill={green ? "#28ff8c" : "#50aaff"}
                          initial={{ opacity: 0.05 }}
                          animate={{ opacity: [0.05, 1, 0.25, 1, 0.4, 1] }}
                          transition={{ delay: litDelay + (u * 0.07 + l * 0.11), duration: 1.3 + (u % 3) * 0.3, repeat: Infinity, repeatType: "mirror" }}
                        />
                      );
                    })}
                  </g>
                );
              })}
              <motion.polygon
                points={`${x0},${f0} ${x1},${f1} ${x1},${f1 + RACK_H * sOf(k1) * 0.6} ${x0},${f0 + RACK_H * sOf(k0) * 0.6}`}
                fill="#3caaff"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.16 * sOf(k0) }}
                transition={{ delay: litDelay, duration: 0.8 }}
              />
            </g>
          );
        }),
      )}

      {/* Overhead bus surge travelling toward the viewer */}
      <motion.circle
        cx={VP.x}
        r="18"
        fill="url(#cyanglow)"
        initial={{ cy: VP.y, opacity: 0, scale: 0.5 }}
        animate={{ cy: [VP.y, ceilY(0)], opacity: [0, 1, 1, 0], scale: [0.5, 1.6] }}
        transition={{ delay: 0.4, duration: 1.5, ease: "easeIn", times: [0, 0.1, 0.9, 1] }}
      />
      <Bolt variants={BUS_BOLT} width={2.2} delay={0.45} duration={1.5} repeatDelay={0.35} pathLength />
      {DC_ARCS.map((arc, i) => (
        <Bolt key={i} variants={arc.v} color="#78aaff" width={1 + sOf(arc.k)} delay={0.6 + (1 - arc.k) * 0.9 + (i % 2) * 0.15} repeatDelay={0.7 + (i % 3) * 0.3} />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Scene 3: Plasma globe
// ---------------------------------------------------------------------------

const GLOBE_R = 150;
const FILAMENTS = Array.from({ length: 12 }, (_, i) => {
  const ang = (i / 12) * Math.PI * 2 + 0.2;
  const end = { x: Math.cos(ang) * GLOBE_R * 0.96, y: Math.sin(ang) * GLOBE_R * 0.96 };
  return {
    end,
    variants: boltVariants({ x: 0, y: 0 }, end, 400 + i, 42, 5, 4),
    pink: i % 4 === 1,
    speed: 0.28 + (i % 3) * 0.06,
  };
});
const ORB_FILAMENT = boltVariants({ x: 0, y: 0 }, { x: GLOBE_R * 0.9, y: 0 }, 499, 36, 5, 4);

export function PlasmaGlobe({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 420" className={className} aria-hidden="true">
      <defs>
        <filter id="pglow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="pbloom" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <radialGradient id="glass" cx="0.38" cy="0.32" r="0.75">
          <stop offset="0%" stopColor="#2a1a4a" stopOpacity="0.35" />
          <stop offset="70%" stopColor="#140a2e" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#3b2a7a" stopOpacity="0.7" />
        </radialGradient>
        <radialGradient id="rim" cx="0.5" cy="0.5" r="0.5">
          <stop offset="86%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="96%" stopColor="#c0c8ff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#e6ecff" stopOpacity="0.5" />
        </radialGradient>
        <radialGradient id="core">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="35%" stopColor="#b266ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#b266ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="tip">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#5ad8ff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#5ad8ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="orb">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="30%" stopColor="#5ad8ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#5ad8ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="base" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0a0d14" />
          <stop offset="45%" stopColor="#2a3140" />
          <stop offset="55%" stopColor="#1b202b" />
          <stop offset="100%" stopColor="#07090e" />
        </linearGradient>
      </defs>

      <motion.circle cx="200" cy="200" r="190" fill="#8a5cff" filter="url(#pbloom)" animate={{ opacity: [0.18, 0.3, 0.18] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} />

      <path d="M 120 330 L 280 330 L 342 392 Q 200 418 58 392 Z" fill="url(#base)" />
      <motion.rect x="130" y="364" width="140" height="2" fill="#b266ff" animate={{ opacity: [0.25, 0.5, 0.25] }} transition={{ duration: 2.4, repeat: Infinity }} />

      <circle cx="200" cy="200" r={GLOBE_R} fill="url(#glass)" />

      <g transform="translate(200 200)">
        <clipPath id="globeclip">
          <circle cx="0" cy="0" r={GLOBE_R - 2} />
        </clipPath>
        <g clipPath="url(#globeclip)">
          <motion.g animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }}>
            <circle cx="0" cy="0" r={GLOBE_R} fill="none" stroke="none" />
            {FILAMENTS.map((f, i) => (
              <g key={i} filter="url(#pglow)" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <motion.path
                  d={f.variants[0]}
                  animate={{ d: f.variants, opacity: [0.5, 1, 0.6, 1, 0.5] }}
                  transition={{ d: { duration: f.speed, repeat: Infinity, ease: "linear" }, opacity: { duration: 1.1 + (i % 3) * 0.4, repeat: Infinity } }}
                  stroke={f.pink ? "#ff80d6" : "#b266ff"}
                  strokeOpacity="0.35"
                  strokeWidth="7"
                />
                <motion.path d={f.variants[0]} animate={{ d: f.variants }} transition={{ duration: f.speed, repeat: Infinity, ease: "linear" }} stroke={f.pink ? "#ff80d6" : "#b266ff"} strokeWidth="2" />
                <motion.path d={f.variants[0]} animate={{ d: f.variants }} transition={{ duration: f.speed, repeat: Infinity, ease: "linear" }} stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.9" />
                <motion.circle cx={f.end.x} cy={f.end.y} r="16" fill="url(#tip)" animate={{ opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 0.9 + (i % 4) * 0.25, repeat: Infinity }} />
              </g>
            ))}
          </motion.g>

          {/* Orbiting electrical ball with its own filament */}
          <motion.g animate={{ rotate: 360 }} transition={{ duration: 7, repeat: Infinity, ease: "linear" }}>
            <circle cx="0" cy="0" r={GLOBE_R} fill="none" stroke="none" />
            <g filter="url(#pglow)" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <motion.path d={ORB_FILAMENT[0]} animate={{ d: ORB_FILAMENT }} transition={{ duration: 0.22, repeat: Infinity, ease: "linear" }} stroke="#5ad8ff" strokeOpacity="0.4" strokeWidth="9" />
              <motion.path d={ORB_FILAMENT[0]} animate={{ d: ORB_FILAMENT }} transition={{ duration: 0.22, repeat: Infinity, ease: "linear" }} stroke="#5ad8ff" strokeWidth="2.6" />
              <motion.path d={ORB_FILAMENT[0]} animate={{ d: ORB_FILAMENT }} transition={{ duration: 0.22, repeat: Infinity, ease: "linear" }} stroke="#ffffff" strokeWidth="1.2" />
            </g>
            <motion.circle cx={GLOBE_R * 0.9} cy="0" r="26" fill="url(#orb)" animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 0.6, repeat: Infinity }} />
            <circle cx={GLOBE_R * 0.9} cy="0" r="5" fill="#ffffff" />
          </motion.g>
        </g>

        <motion.circle cx="0" cy="0" r="46" fill="url(#core)" animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.8, 1, 0.8] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} />
        <circle cx="0" cy="0" r="10" fill="#1a1826" />
      </g>

      <circle cx="200" cy="200" r={GLOBE_R} fill="url(#rim)" stroke="#e6ebff" strokeOpacity="0.35" strokeWidth="1.2" />
      <ellipse cx="140" cy="128" rx="42" ry="20" transform="rotate(-40 140 128)" fill="#ffffff" fillOpacity="0.22" filter="url(#pbloom)" />
      <ellipse cx="272" cy="280" rx="13" ry="6" transform="rotate(45 272 280)" fill="#ffffff" fillOpacity="0.14" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Space background
// ---------------------------------------------------------------------------

const STARS = (() => {
  const rng = mulberry32(2024);
  const tints = ["#ffffff", "#dbe8ff", "#ffffff", "#ffe9c9", "#c9dcff"];
  return Array.from({ length: 150 }, (_, i) => ({
    id: i,
    x: rng() * 100,
    y: rng() * 100,
    size: 0.6 + rng() * 2,
    tint: tints[Math.floor(rng() * tints.length)],
    duration: 1.6 + rng() * 3,
    delay: rng() * 4,
    flare: rng() < 0.06,
  }));
})();

const NEBULA_LAYERS = [
  { color: "rgba(40,90,210,0.55)", size: "70vmax", x: "18%", y: "30%", dur: 48, drift: 60 },
  { color: "rgba(165,50,200,0.45)", size: "62vmax", x: "68%", y: "22%", dur: 56, drift: -70 },
  { color: "rgba(20,170,190,0.35)", size: "55vmax", x: "55%", y: "72%", dur: 52, drift: 50 },
  { color: "rgba(255,170,220,0.22)", size: "38vmax", x: "40%", y: "48%", dur: 40, drift: -40 },
];

export function SpaceBackground({ animate = true }: { animate?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#030409]" aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#07061a_0%,#040712_50%,#0a0414_100%)]" />
      {NEBULA_LAYERS.map((l, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full mix-blend-screen blur-3xl"
          style={{
            width: l.size,
            height: l.size,
            left: l.x,
            top: l.y,
            translateX: "-50%",
            translateY: "-50%",
            background: `radial-gradient(closest-side, ${l.color}, transparent 70%)`,
          }}
          animate={
            animate
              ? { x: [0, l.drift, -l.drift * 0.6, 0], y: [0, -l.drift * 0.5, l.drift * 0.4, 0], scale: [1, 1.15, 0.95, 1], rotate: [0, 25, -15, 0] }
              : undefined
          }
          transition={{ duration: l.dur, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      {STARS.map((s) => (
        <motion.span
          key={s.id}
          className="absolute rounded-full"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, background: s.tint, boxShadow: s.flare ? `0 0 ${s.size * 4}px ${s.tint}` : undefined }}
          animate={animate ? { opacity: [0.2, 1, 0.2], scale: s.flare ? [1, 1.6, 1] : undefined } : { opacity: 0.7 }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      {animate &&
        [0, 1].map((i) => (
          <motion.span
            key={`meteor-${i}`}
            className="absolute h-px w-40 bg-gradient-to-r from-transparent via-white/80 to-white"
            style={{ left: i === 0 ? "10%" : "60%", top: i === 0 ? "12%" : "6%", rotate: 28 }}
            initial={{ opacity: 0, x: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], x: [0, 520], y: [0, 280] }}
            transition={{ duration: 1.1, delay: 2 + i * 4.3, repeat: Infinity, repeatDelay: 6.5 + i * 2, ease: "easeIn" }}
          />
        ))}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.65)_100%)]" />
    </div>
  );
}
