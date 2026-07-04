import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchWeather,
  searchLocations,
  weatherInfo,
  windDirLabel,
  aqiCategory,
  uvCategory,
  moonPhase,
  type GeoLocation,
  type WeatherData,
} from "@/lib/weather-api";
import { WindCompass, Gauge } from "@/components/weather/gauges";
import {
  Search, MapPin, Star, Radar, Wind, Droplets, Gauge as GaugeIcon,
  Sun, Eye, CloudRain, Thermometer, Sunrise, Sunset, AlertTriangle,
  Zap, Cloud, Loader2, Navigation,
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/")({
  component: WeatherStation,
});

const FAVORITES_KEY = "ws.favorites.v1";
const LAST_LOC_KEY = "ws.last.v1";

function loadFavorites(): GeoLocation[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
  } catch { return []; }
}

function loadLastLocation(): GeoLocation | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(LAST_LOC_KEY) || "null");
  } catch { return null; }
}

const DEFAULT_LOCATION: GeoLocation = {
  id: 5128581,
  name: "New York",
  country: "United States",
  admin1: "New York",
  latitude: 40.7143,
  longitude: -74.006,
  timezone: "America/New_York",
};

function WeatherStation() {
  const [location, setLocation] = useState<GeoLocation>(DEFAULT_LOCATION);
  const [favorites, setFavorites] = useState<GeoLocation[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const last = loadLastLocation();
    if (last) setLocation(last);
    setFavorites(loadFavorites());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LAST_LOC_KEY, JSON.stringify(location));
    }
  }, [location]);

  const { data: weather, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["weather", location.latitude, location.longitude],
    queryFn: () => fetchWeather(location),
    staleTime: 5 * 60 * 1000,
  });

  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ["search", query],
    queryFn: () => searchLocations(query),
    enabled: query.trim().length >= 2,
    staleTime: 60_000,
  });

  const toggleFav = (loc: GeoLocation) => {
    const exists = favorites.some((f) => f.id === loc.id);
    const next = exists ? favorites.filter((f) => f.id !== loc.id) : [...favorites, loc];
    setFavorites(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setLocation({
        id: Date.now(),
        name: "Current Location",
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    });
  };

  const isFav = favorites.some((f) => f.id === location.id);

  return (
    <div className="min-h-screen grid-overlay">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-6">
        <Header
          location={location}
          isFav={isFav}
          onToggleFav={() => toggleFav(location)}
          onOpenSearch={() => setSearchOpen(true)}
          onUseMyLocation={useMyLocation}
          onRefresh={() => refetch()}
          isFetching={isFetching}
        />

        {isLoading && <LoadingState />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {weather && <Dashboard weather={weather} />}

        <Footer />
      </div>

      {searchOpen && (
        <SearchModal
          query={query}
          setQuery={setQuery}
          results={searchResults || []}
          isSearching={isSearching}
          favorites={favorites}
          onSelect={(loc) => {
            setLocation(loc);
            setSearchOpen(false);
            setQuery("");
          }}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
}

function Header({
  location, isFav, onToggleFav, onOpenSearch, onUseMyLocation, onRefresh, isFetching,
}: {
  location: GeoLocation;
  isFav: boolean;
  onToggleFav: () => void;
  onOpenSearch: () => void;
  onUseMyLocation: () => void;
  onRefresh: () => void;
  isFetching: boolean;
}) {
  return (
    <header className="hud-panel px-4 sm:px-6 py-3 mb-4 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <div className="relative w-9 h-9 rounded-full border border-[var(--color-hud)]/40 flex items-center justify-center overflow-hidden">
          <Radar className="w-5 h-5 text-[var(--color-hud)]" strokeWidth={1.5} />
          <div className="absolute inset-0 animate-sweep origin-center" style={{
            background: "conic-gradient(from 0deg, transparent 0%, var(--hud-glow) 20%, transparent 25%)",
          }} />
        </div>
        <div className="leading-tight">
          <div className="hud-label">Weather Station</div>
          <div className="text-sm font-semibold">Cockpit v1.0</div>
        </div>
      </div>

      <div className="flex-1 min-w-[180px]" />

      <div className="flex items-center gap-1.5 mr-2 min-w-0">
        <MapPin className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
        <div className="min-w-0">
          <div className="font-semibold truncate">{location.name}</div>
          <div className="hud-label truncate">{[location.admin1, location.country].filter(Boolean).join(" · ")}</div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button onClick={onToggleFav} title="Favorite" className={`p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-secondary)] transition ${isFav ? "text-[var(--color-accent)]" : "text-[var(--color-muted-foreground)]"}`}>
          <Star className="w-4 h-4" fill={isFav ? "currentColor" : "none"} />
        </button>
        <button onClick={onUseMyLocation} title="Use my location" className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-secondary)] transition text-[var(--color-muted-foreground)]">
          <Navigation className="w-4 h-4" />
        </button>
        <button onClick={onRefresh} title="Refresh" className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-secondary)] transition text-[var(--color-muted-foreground)]">
          <Loader2 className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
        <button onClick={onOpenSearch} className="px-3 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition">
          <Search className="w-4 h-4" /> Search
        </button>
      </div>
    </header>
  );
}

function LoadingState() {
  return (
    <div className="hud-panel p-12 flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--color-hud)]" />
      <div className="hud-label">Acquiring weather signal…</div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="hud-panel p-8 text-center">
      <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-[var(--color-danger)]" />
      <div className="font-semibold">Weather signal lost</div>
      <p className="text-sm text-[var(--color-muted-foreground)] mt-1">Could not reach the weather network.</p>
      <button onClick={onRetry} className="mt-4 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-semibold">Retry</button>
    </div>
  );
}

function Dashboard({ weather }: { weather: WeatherData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <CurrentPanel weather={weather} />
      <WindPanel weather={weather} />
      <AtmosphericPanel weather={weather} />
      <div className="lg:col-span-2"><TemperatureChart weather={weather} /></div>
      <RainCenter weather={weather} />
      <div className="lg:col-span-2"><HourlyForecast weather={weather} /></div>
      <CloudAnalysis weather={weather} />
      <div className="lg:col-span-2"><DailyForecast weather={weather} /></div>
      <AirQuality weather={weather} />
      <StormIntelligence weather={weather} />
      <SunMoonPanel weather={weather} />
      <AlertsPanel weather={weather} />
    </div>
  );
}

function CurrentPanel({ weather }: { weather: WeatherData }) {
  const c = weather.current;
  const info = weatherInfo(c.weather_code, c.is_day);
  return (
    <section className="hud-panel p-5 lg:col-span-1 relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-20 blur-3xl" style={{ background: "var(--color-hud)" }} />
      <div className="flex items-center justify-between">
        <div className="hud-label">Current Conditions</div>
        <div className="hud-label animate-pulse-hud">● LIVE</div>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <div className="text-7xl leading-none">{info.icon}</div>
        <div>
          <div className="text-6xl font-bold hud-value tracking-tight">{Math.round(c.temperature_2m)}°</div>
          <div className="text-sm text-[var(--color-foreground)]/80">{info.label}</div>
          <div className="hud-label mt-1">Feels {Math.round(c.apparent_temperature)}°C</div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <MiniStat icon={<Droplets className="w-4 h-4" />} label="Humidity" value={`${c.relative_humidity_2m}%`} />
        <MiniStat icon={<Wind className="w-4 h-4" />} label="Wind" value={`${Math.round(c.wind_speed_10m)} km/h`} />
        <MiniStat icon={<GaugeIcon className="w-4 h-4" />} label="Pressure" value={`${Math.round(c.pressure_msl)} hPa`} />
        <MiniStat icon={<Eye className="w-4 h-4" />} label="Visibility" value={`${(c.visibility / 1000).toFixed(0)} km`} />
        <MiniStat icon={<Cloud className="w-4 h-4" />} label="Cloud" value={`${c.cloud_cover}%`} />
        <MiniStat icon={<Sun className="w-4 h-4" />} label="UV" value={c.uv_index.toFixed(1)} />
      </div>
    </section>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/30 py-2 px-2">
      <div className="flex items-center justify-center gap-1 text-[var(--color-hud)]">{icon}<span className="hud-value text-sm font-semibold">{value}</span></div>
      <div className="hud-label mt-1">{label}</div>
    </div>
  );
}

function WindPanel({ weather }: { weather: WeatherData }) {
  const c = weather.current;
  return (
    <section className="hud-panel p-5 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="hud-label">Wind Cockpit</div>
        <Wind className="w-4 h-4 text-[var(--color-hud)]" />
      </div>
      <div className="flex-1 flex items-center justify-center py-4">
        <WindCompass direction={c.wind_direction_10m} speed={c.wind_speed_10m} gusts={c.wind_gusts_10m} />
      </div>
    </section>
  );
}

function AtmosphericPanel({ weather }: { weather: WeatherData }) {
  const c = weather.current;
  // Air density calc: p / (R * T), R = 287.05 J/(kg·K)
  const tempK = c.temperature_2m + 273.15;
  const density = (c.pressure_msl * 100) / (287.05 * tempK);
  // Pressure trend: compare with hourly[+3h]
  const nowIdx = weather.hourly.time.findIndex((t) => new Date(t).getTime() >= Date.now());
  const trend = nowIdx > 0 && weather.hourly.pressure_msl[nowIdx + 3]
    ? weather.hourly.pressure_msl[nowIdx + 3] - c.pressure_msl : 0;

  return (
    <section className="hud-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="hud-label">Atmospheric Analysis</div>
        <GaugeIcon className="w-4 h-4 text-[var(--color-hud)]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Gauge label="Pressure" value={c.pressure_msl} max={1050} unit="hPa" />
        <Gauge label="Humidity" value={c.relative_humidity_2m} max={100} unit="%" color="var(--color-accent)" />
        <Gauge label="UV Index" value={c.uv_index} max={12} unit="index" color="var(--warning)" />
        <Gauge label="Visibility" value={c.visibility / 1000} max={25} unit="km" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md border border-[var(--color-border)] px-2 py-1.5">
          <div className="hud-label">Dew Point</div>
          <div className="hud-value">{c.dew_point_2m.toFixed(1)}°C</div>
        </div>
        <div className="rounded-md border border-[var(--color-border)] px-2 py-1.5">
          <div className="hud-label">Air Density</div>
          <div className="hud-value">{density.toFixed(3)} kg/m³</div>
        </div>
        <div className="rounded-md border border-[var(--color-border)] px-2 py-1.5">
          <div className="hud-label">Pressure Trend</div>
          <div className={`hud-value ${trend > 0.5 ? "text-[var(--success)]" : trend < -0.5 ? "text-[var(--danger)]" : ""}`}>
            {trend > 0 ? "▲" : trend < 0 ? "▼" : "→"} {Math.abs(trend).toFixed(1)} hPa
          </div>
        </div>
        <div className="rounded-md border border-[var(--color-border)] px-2 py-1.5">
          <div className="hud-label">Surface P.</div>
          <div className="hud-value">{Math.round(c.surface_pressure)} hPa</div>
        </div>
      </div>
    </section>
  );
}

function TemperatureChart({ weather }: { weather: WeatherData }) {
  const data = useMemo(() => {
    const nowIdx = weather.hourly.time.findIndex((t) => new Date(t).getTime() >= Date.now());
    const start = Math.max(0, nowIdx);
    return weather.hourly.time.slice(start, start + 24).map((t, i) => ({
      time: new Date(t).toLocaleTimeString([], { hour: "2-digit" }),
      temp: weather.hourly.temperature_2m[start + i],
      feels: weather.hourly.apparent_temperature[start + i],
    }));
  }, [weather]);

  return (
    <section className="hud-panel p-5">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="hud-label">Temperature Lab</div>
          <div className="text-sm font-semibold">24-hour trend</div>
        </div>
        <Thermometer className="w-4 h-4 text-[var(--color-hud)]" />
      </div>
      <div className="h-56 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.7} />
                <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="time" stroke="var(--color-muted-foreground)" fontSize={10} interval={2} />
            <YAxis stroke="var(--color-muted-foreground)" fontSize={10} unit="°" />
            <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
            <Area type="monotone" dataKey="temp" stroke="var(--color-chart-1)" fill="url(#tempGrad)" strokeWidth={2} name="Temp °C" />
            <Line type="monotone" dataKey="feels" stroke="var(--color-chart-2)" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Feels °C" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function RainCenter({ weather }: { weather: WeatherData }) {
  const nowIdx = weather.hourly.time.findIndex((t) => new Date(t).getTime() >= Date.now());
  const start = Math.max(0, nowIdx);
  const next12 = weather.hourly.precipitation.slice(start, start + 12);
  const probs = weather.hourly.precipitation_probability.slice(start, start + 12);
  const times = weather.hourly.time.slice(start, start + 12);
  const total = next12.reduce((a, b) => a + b, 0);
  const firstRainIdx = next12.findIndex((v, i) => v > 0.1 || probs[i] > 60);
  const arrivalTime = firstRainIdx >= 0 ? new Date(times[firstRainIdx]) : null;

  const data = next12.map((v, i) => ({
    time: new Date(times[i]).toLocaleTimeString([], { hour: "2-digit" }),
    mm: v,
    prob: probs[i],
  }));

  return (
    <section className="hud-panel p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="hud-label">Rain Center</div>
        <CloudRain className="w-4 h-4 text-[var(--color-hud)]" />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-md border border-[var(--color-border)] p-2">
          <div className="hud-label">Next 12h</div>
          <div className="hud-value text-lg">{total.toFixed(1)} mm</div>
        </div>
        <div className="rounded-md border border-[var(--color-border)] p-2">
          <div className="hud-label">Arrival</div>
          <div className="hud-value text-lg">
            {arrivalTime ? arrivalTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
          </div>
        </div>
      </div>
      <div className="h-32 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="time" stroke="var(--color-muted-foreground)" fontSize={9} />
            <YAxis stroke="var(--color-muted-foreground)" fontSize={9} unit="mm" />
            <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="mm" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function HourlyForecast({ weather }: { weather: WeatherData }) {
  const nowIdx = weather.hourly.time.findIndex((t) => new Date(t).getTime() >= Date.now());
  const start = Math.max(0, nowIdx);
  const items = Array.from({ length: 24 }).map((_, i) => {
    const idx = start + i;
    return {
      time: weather.hourly.time[idx],
      temp: weather.hourly.temperature_2m[idx],
      code: weather.hourly.weather_code[idx],
      prob: weather.hourly.precipitation_probability[idx],
      wind: weather.hourly.wind_speed_10m[idx],
    };
  });

  return (
    <section className="hud-panel p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="hud-label">Forecast Center</div>
          <div className="text-sm font-semibold">Next 24 hours</div>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 snap-x">
        {items.map((h, i) => {
          const info = weatherInfo(h.code, 1);
          return (
            <div key={i} className="snap-start shrink-0 w-20 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)]/30 p-2 text-center">
              <div className="hud-label">{i === 0 ? "Now" : new Date(h.time).toLocaleTimeString([], { hour: "2-digit" })}</div>
              <div className="text-2xl my-1">{info.icon}</div>
              <div className="hud-value font-semibold">{Math.round(h.temp)}°</div>
              <div className="text-[10px] text-[var(--color-chart-1)] mt-0.5">💧 {h.prob}%</div>
              <div className="text-[10px] text-[var(--color-muted-foreground)]">{Math.round(h.wind)} km/h</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CloudAnalysis({ weather }: { weather: WeatherData }) {
  const c = weather.current;
  const nowIdx = weather.hourly.time.findIndex((t) => new Date(t).getTime() >= Date.now());
  const idx = Math.max(0, nowIdx);
  const low = weather.hourly.cloud_cover_low[idx] || 0;
  const mid = weather.hourly.cloud_cover_mid[idx] || 0;
  const high = weather.hourly.cloud_cover_high[idx] || 0;

  const Bar = ({ label, val, color }: { label: string; val: number; color: string }) => (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="hud-label">{label}</span>
        <span className="hud-value">{val}%</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-background)]/60 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, background: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
    </div>
  );

  return (
    <section className="hud-panel p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="hud-label">Cloud Analysis</div>
        <Cloud className="w-4 h-4 text-[var(--color-hud)]" />
      </div>
      <div className="text-center mb-4">
        <div className="text-5xl">☁️</div>
        <div className="hud-value text-3xl font-bold">{c.cloud_cover}%</div>
        <div className="hud-label">Total Cover</div>
      </div>
      <div className="space-y-3">
        <Bar label="High Clouds" val={high} color="var(--color-chart-3)" />
        <Bar label="Medium Clouds" val={mid} color="var(--color-chart-1)" />
        <Bar label="Low Clouds" val={low} color="var(--color-chart-2)" />
      </div>
    </section>
  );
}

function DailyForecast({ weather }: { weather: WeatherData }) {
  const d = weather.daily;
  const globalMin = Math.min(...d.temperature_2m_min);
  const globalMax = Math.max(...d.temperature_2m_max);
  const range = globalMax - globalMin || 1;

  return (
    <section className="hud-panel p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="hud-label">14-Day Trend</div>
          <div className="text-sm font-semibold">Daily Forecast</div>
        </div>
      </div>
      <div className="space-y-1.5">
        {d.time.map((day, i) => {
          const info = weatherInfo(d.weather_code[i], 1);
          const min = d.temperature_2m_min[i];
          const max = d.temperature_2m_max[i];
          const leftPct = ((min - globalMin) / range) * 100;
          const widthPct = ((max - min) / range) * 100;
          const date = new Date(day);
          return (
            <div key={day} className="grid grid-cols-[70px_28px_60px_1fr_60px] items-center gap-2 text-sm py-1 border-b border-[var(--color-border)]/40 last:border-0">
              <div>
                <div className="font-semibold text-xs">{i === 0 ? "Today" : date.toLocaleDateString([], { weekday: "short" })}</div>
                <div className="hud-label text-[10px]">{date.toLocaleDateString([], { month: "short", day: "numeric" })}</div>
              </div>
              <div className="text-lg text-center">{info.icon}</div>
              <div className="text-xs text-[var(--color-chart-1)]">💧 {d.precipitation_probability_max[i]}%</div>
              <div className="relative h-2 bg-[var(--color-background)]/60 rounded-full">
                <div
                  className="absolute h-full rounded-full"
                  style={{
                    left: `${leftPct}%`,
                    width: `${Math.max(widthPct, 5)}%`,
                    background: "linear-gradient(90deg, var(--color-chart-2), var(--color-chart-1), var(--color-chart-5))",
                  }}
                />
              </div>
              <div className="text-right hud-value text-xs whitespace-nowrap">
                <span className="text-[var(--color-muted-foreground)]">{Math.round(min)}°</span>
                <span className="mx-1">/</span>
                <span className="font-bold">{Math.round(max)}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AirQuality({ weather }: { weather: WeatherData }) {
  const aq = weather.airQuality;
  if (!aq) {
    return (
      <section className="hud-panel p-5">
        <div className="hud-label">Air Quality Monitor</div>
        <div className="text-sm text-[var(--color-muted-foreground)] mt-4">Air quality data unavailable for this location.</div>
      </section>
    );
  }
  const cat = aqiCategory(aq.european_aqi);
  const rec = aq.european_aqi <= 40
    ? "Air quality is excellent. Enjoy outdoor activities."
    : aq.european_aqi <= 60
    ? "Sensitive groups should limit prolonged outdoor exertion."
    : aq.european_aqi <= 80
    ? "Consider reducing outdoor exertion, especially for sensitive groups."
    : "Avoid prolonged outdoor activity. Wear a mask if necessary.";

  return (
    <section className="hud-panel p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="hud-label">Air Quality Monitor</div>
      </div>
      <div className="text-center mb-3">
        <div className={`text-4xl font-bold hud-value ${cat.color}`}>{Math.round(aq.european_aqi)}</div>
        <div className={`text-sm font-semibold ${cat.color}`}>{cat.label}</div>
        <div className="hud-label mt-1">European AQI</div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <AqTile label="PM2.5" value={aq.pm2_5?.toFixed(1)} unit="µg/m³" />
        <AqTile label="PM10" value={aq.pm10?.toFixed(1)} unit="µg/m³" />
        <AqTile label="O₃" value={aq.ozone?.toFixed(0)} unit="µg/m³" />
        <AqTile label="NO₂" value={aq.nitrogen_dioxide?.toFixed(0)} unit="µg/m³" />
        <AqTile label="SO₂" value={aq.sulphur_dioxide?.toFixed(0)} unit="µg/m³" />
        <AqTile label="CO" value={aq.carbon_monoxide?.toFixed(0)} unit="µg/m³" />
      </div>
      <p className="text-xs text-[var(--color-muted-foreground)] mt-3">{rec}</p>
    </section>
  );
}

function AqTile({ label, value, unit }: { label: string; value?: string; unit: string }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] p-2">
      <div className="hud-label">{label}</div>
      <div className="hud-value font-semibold">{value ?? "—"}</div>
      <div className="hud-label text-[9px]">{unit}</div>
    </div>
  );
}

function StormIntelligence({ weather }: { weather: WeatherData }) {
  const c = weather.current;
  const nowIdx = weather.hourly.time.findIndex((t) => new Date(t).getTime() >= Date.now());
  const start = Math.max(0, nowIdx);
  const next6 = weather.hourly.weather_code.slice(start, start + 6);
  const gusts = weather.hourly.wind_gusts_10m.slice(start, start + 6);
  const rainNext6 = weather.hourly.precipitation.slice(start, start + 6).reduce((a, b) => a + b, 0);

  const thunder = next6.some((c) => c >= 95) ? "Likely" : c.weather_code >= 80 ? "Possible" : "Unlikely";
  const lightning = next6.some((c) => c >= 95);
  const floodRisk = rainNext6 > 15 ? "High" : rainNext6 > 5 ? "Moderate" : "Low";
  const windHazard = Math.max(...gusts, c.wind_gusts_10m) > 60 ? "High" : Math.max(...gusts) > 40 ? "Moderate" : "Low";
  const hail = next6.some((c) => c === 96 || c === 99) ? "Possible" : "Unlikely";

  const riskColor = (v: string) => v === "High" || v === "Likely" ? "text-[var(--color-danger)]"
    : v === "Moderate" || v === "Possible" ? "text-[var(--color-warning)]"
    : "text-[var(--color-success)]";

  return (
    <section className="hud-panel p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="hud-label">Storm Intelligence</div>
        <Zap className={`w-4 h-4 ${lightning ? "text-[var(--color-warning)] animate-pulse-hud" : "text-[var(--color-hud)]"}`} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <StormTile label="Lightning" value={lightning ? "Detected" : "None"} color={lightning ? "text-[var(--color-warning)]" : "text-[var(--color-success)]"} />
        <StormTile label="Thunder" value={thunder} color={riskColor(thunder)} />
        <StormTile label="Flood Risk" value={floodRisk} color={riskColor(floodRisk)} />
        <StormTile label="Wind Hazard" value={windHazard} color={riskColor(windHazard)} />
        <StormTile label="Hail Potential" value={hail} color={riskColor(hail)} />
        <StormTile label="Max Gust 6h" value={`${Math.round(Math.max(...gusts))} km/h`} color="text-[var(--color-hud)]" />
      </div>
    </section>
  );
}

function StormTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] p-2">
      <div className="hud-label">{label}</div>
      <div className={`font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function SunMoonPanel({ weather }: { weather: WeatherData }) {
  const sunrise = new Date(weather.daily.sunrise[0]);
  const sunset = new Date(weather.daily.sunset[0]);
  const now = new Date();
  const dayLen = sunset.getTime() - sunrise.getTime();
  const progress = Math.max(0, Math.min(1, (now.getTime() - sunrise.getTime()) / dayLen));
  const moon = moonPhase(now);

  return (
    <section className="hud-panel p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="hud-label">Sun & Moon</div>
      </div>
      <div className="relative h-24 mb-3">
        <svg viewBox="0 0 200 100" className="w-full h-full">
          <path d="M 10 90 Q 100 -20 190 90" fill="none" stroke="var(--color-border)" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M 10 90 Q 100 -20 190 90" fill="none" stroke="var(--color-accent)" strokeWidth="2"
            strokeDasharray="250"
            strokeDashoffset={250 - 250 * progress}
            style={{ filter: "drop-shadow(0 0 6px var(--color-accent))" }} />
          <circle cx={10 + (190 - 10) * progress} cy={90 - Math.sin(progress * Math.PI) * 90} r="6" fill="var(--color-accent)" style={{ filter: "drop-shadow(0 0 8px var(--color-accent))" }} />
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div className="rounded-md border border-[var(--color-border)] p-2 flex items-center gap-2">
          <Sunrise className="w-4 h-4 text-[var(--color-accent)]" />
          <div>
            <div className="hud-label">Sunrise</div>
            <div className="hud-value">{sunrise.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          </div>
        </div>
        <div className="rounded-md border border-[var(--color-border)] p-2 flex items-center gap-2">
          <Sunset className="w-4 h-4 text-[var(--color-accent)]" />
          <div>
            <div className="hud-label">Sunset</div>
            <div className="hud-value">{sunset.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          </div>
        </div>
      </div>
      <div className="rounded-md border border-[var(--color-border)] p-3 flex items-center gap-3">
        <div className="text-4xl">{moon.icon}</div>
        <div>
          <div className="hud-label">Moon Phase</div>
          <div className="font-semibold text-sm">{moon.name}</div>
          <div className="hud-label text-[10px]">Illumination: {moon.illumination}%</div>
        </div>
      </div>
    </section>
  );
}

function AlertsPanel({ weather }: { weather: WeatherData }) {
  const c = weather.current;
  const alerts: { icon: string; label: string; sev: "high" | "med" | "low" }[] = [];

  if (c.uv_index >= 8) alerts.push({ icon: "☀️", label: `Extreme UV: ${c.uv_index.toFixed(1)} — protect skin`, sev: "high" });
  if (c.wind_gusts_10m > 60) alerts.push({ icon: "🌬️", label: `Strong wind gusts up to ${Math.round(c.wind_gusts_10m)} km/h`, sev: "high" });
  if (c.temperature_2m >= 35) alerts.push({ icon: "🔥", label: `Extreme heat: ${Math.round(c.temperature_2m)}°C`, sev: "high" });
  if (c.temperature_2m <= -10) alerts.push({ icon: "🥶", label: `Extreme cold: ${Math.round(c.temperature_2m)}°C`, sev: "high" });
  if (c.weather_code >= 95) alerts.push({ icon: "⛈️", label: "Thunderstorm in progress", sev: "high" });
  const rainNext6 = weather.hourly.precipitation.slice(0, 6).reduce((a, b) => a + b, 0);
  if (rainNext6 > 10) alerts.push({ icon: "🌧️", label: `Heavy rain expected (${rainNext6.toFixed(0)}mm in 6h)`, sev: "med" });
  const uv = uvCategory(c.uv_index);
  alerts.push({ icon: "🛰️", label: `UV index ${uv.label.toLowerCase()} (${c.uv_index.toFixed(1)})`, sev: "low" });

  return (
    <section className="hud-panel p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="hud-label">Smart Alerts</div>
        <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />
      </div>
      <div className="space-y-2">
        {alerts.slice(0, 5).map((a, i) => (
          <div key={i} className={`flex items-start gap-2 rounded-md border p-2 text-sm ${
            a.sev === "high" ? "border-[var(--color-danger)]/50 bg-[var(--color-danger)]/10"
            : a.sev === "med" ? "border-[var(--color-warning)]/50 bg-[var(--color-warning)]/10"
            : "border-[var(--color-border)]"
          }`}>
            <span className="text-lg leading-none">{a.icon}</span>
            <span className="flex-1">{a.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SearchModal({
  query, setQuery, results, isSearching, favorites, onSelect, onClose,
}: {
  query: string;
  setQuery: (q: string) => void;
  results: GeoLocation[];
  isSearching: boolean;
  favorites: GeoLocation[];
  onSelect: (loc: GeoLocation) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg hud-panel overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-3 border-b border-[var(--color-border)] flex items-center gap-2">
          <Search className="w-4 h-4 text-[var(--color-muted-foreground)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city, village, ZIP…"
            className="flex-1 bg-transparent outline-none text-sm"
          />
          {isSearching && <Loader2 className="w-4 h-4 animate-spin text-[var(--color-muted-foreground)]" />}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {query.trim().length < 2 && favorites.length > 0 && (
            <div>
              <div className="hud-label px-3 pt-3">Favorites</div>
              {favorites.map((f) => (
                <button key={f.id} onClick={() => onSelect(f)} className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[var(--color-secondary)] transition">
                  <Star className="w-4 h-4 text-[var(--color-accent)]" fill="currentColor" />
                  <div>
                    <div className="font-semibold text-sm">{f.name}</div>
                    <div className="hud-label">{[f.admin1, f.country].filter(Boolean).join(" · ")}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {results.length > 0 && (
            <div>
              <div className="hud-label px-3 pt-3">Results</div>
              {results.map((r) => (
                <button key={r.id} onClick={() => onSelect(r)} className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[var(--color-secondary)] transition">
                  <MapPin className="w-4 h-4 text-[var(--color-hud)]" />
                  <div>
                    <div className="font-semibold text-sm">{r.name}</div>
                    <div className="hud-label">{[r.admin1, r.country].filter(Boolean).join(" · ")}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {query.trim().length >= 2 && !isSearching && results.length === 0 && (
            <div className="p-6 text-center text-sm text-[var(--color-muted-foreground)]">No locations found</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-6 text-center hud-label">
      Weather Station · Data from Open-Meteo · Understand the sky, not just the forecast
    </footer>
  );
}
