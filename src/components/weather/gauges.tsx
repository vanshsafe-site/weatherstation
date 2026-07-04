import { windDirLabel } from "@/lib/weather-api";

export function WindCompass({ direction, speed, gusts }: { direction: number; speed: number; gusts: number }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 88;

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-[0_0_20px_var(--hud-glow)]">
        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke="var(--color-border)" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-hud)" strokeOpacity="0.3" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={r - 20} fill="none" stroke="var(--color-hud)" strokeOpacity="0.15" strokeWidth="1" />

        {/* Tick marks */}
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = (i * 10 * Math.PI) / 180;
          const isMajor = i % 9 === 0;
          const inner = r - (isMajor ? 14 : 6);
          const x1 = cx + Math.sin(angle) * inner;
          const y1 = cy - Math.cos(angle) * inner;
          const x2 = cx + Math.sin(angle) * r;
          const y2 = cy - Math.cos(angle) * r;
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="var(--color-hud)"
              strokeOpacity={isMajor ? 0.9 : 0.35}
              strokeWidth={isMajor ? 1.5 : 1}
            />
          );
        })}

        {/* Cardinal letters */}
        {[
          { l: "N", a: 0 }, { l: "E", a: 90 }, { l: "S", a: 180 }, { l: "W", a: 270 },
        ].map((c) => {
          const rad = (c.a * Math.PI) / 180;
          const rr = r - 30;
          const x = cx + Math.sin(rad) * rr;
          const y = cy - Math.cos(rad) * rr;
          return (
            <text
              key={c.l}
              x={x} y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="var(--font-mono)"
              fontSize="12"
              fontWeight="600"
              fill={c.l === "N" ? "var(--color-accent)" : "var(--color-hud)"}
            >
              {c.l}
            </text>
          );
        })}

        {/* Wind arrow */}
        <g transform={`rotate(${direction} ${cx} ${cy})`}>
          <line x1={cx} y1={cy + 40} x2={cx} y2={cy - 60} stroke="var(--color-hud)" strokeWidth="3" strokeLinecap="round" />
          <polygon points={`${cx},${cy - 68} ${cx - 8},${cy - 52} ${cx + 8},${cy - 52}`} fill="var(--color-hud)" />
          <circle cx={cx} cy={cy} r="6" fill="var(--color-accent)" />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="mt-1 hud-label">Wind</div>
        <div className="hud-value text-2xl font-bold leading-tight">{Math.round(speed)}</div>
        <div className="hud-label">km/h · {windDirLabel(direction)}</div>
      </div>
      <div className="mt-3 flex gap-4 text-xs">
        <div><span className="hud-label">DIR </span><span className="hud-value">{Math.round(direction)}°</span></div>
        <div><span className="hud-label">GUST </span><span className="hud-value">{Math.round(gusts)} km/h</span></div>
      </div>
    </div>
  );
}

export function Gauge({ label, value, max, unit, color = "var(--color-hud)" }: { label: string; value: number; max: number; unit: string; color?: string }) {
  const size = 140;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const r = 52;
  const pct = Math.min(1, Math.max(0, value / max));
  const start = -220;
  const end = 40;
  const total = end - start;
  const angle = start + total * pct;

  const polar = (a: number) => {
    const rad = (a * Math.PI) / 180;
    return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
  };

  const p0 = polar(start);
  const p1 = polar(end);
  const pv = polar(angle);
  const largeArc = total > 180 ? 1 : 0;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path
          d={`M ${p0.x} ${p0.y} A ${r} ${r} 0 ${largeArc} 1 ${p1.x} ${p1.y}`}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d={`M ${p0.x} ${p0.y} A ${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${pv.x} ${pv.y}`}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
        <text x={cx} y={cy - 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="22" fontWeight="700" fill="var(--color-hud)">
          {typeof value === "number" ? (value < 10 ? value.toFixed(1) : Math.round(value)) : value}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill="var(--color-muted-foreground)" letterSpacing="1.5">
          {unit}
        </text>
      </svg>
      <div className="hud-label mt-1">{label}</div>
    </div>
  );
}
