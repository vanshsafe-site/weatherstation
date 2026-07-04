export interface GeoLocation {
  id: number;
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export interface WeatherData {
  location: GeoLocation;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    dew_point_2m: number;
    precipitation: number;
    rain: number;
    weather_code: number;
    cloud_cover: number;
    pressure_msl: number;
    surface_pressure: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
    visibility: number;
    uv_index: number;
    is_day: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
    pressure_msl: number[];
    cloud_cover: number[];
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    wind_gusts_10m: number[];
    relative_humidity_2m: number[];
    uv_index: number[];
    visibility: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    apparent_temperature_max: number[];
    apparent_temperature_min: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
    wind_direction_10m_dominant: number[];
  };
  airQuality?: {
    time: string;
    pm10: number;
    pm2_5: number;
    carbon_monoxide: number;
    nitrogen_dioxide: number;
    sulphur_dioxide: number;
    ozone: number;
    european_aqi: number;
  };
}

export async function searchLocations(query: string): Promise<GeoLocation[]> {
  if (!query.trim()) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding failed");
  const data = await res.json();
  return data.results || [];
}

export async function fetchWeather(loc: GeoLocation): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    current: [
      "temperature_2m", "apparent_temperature", "relative_humidity_2m", "dew_point_2m",
      "precipitation", "rain", "weather_code", "cloud_cover", "pressure_msl", "surface_pressure",
      "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m", "visibility", "uv_index", "is_day",
    ].join(","),
    hourly: [
      "temperature_2m", "apparent_temperature", "precipitation_probability", "precipitation",
      "weather_code", "pressure_msl", "cloud_cover", "cloud_cover_low", "cloud_cover_mid",
      "cloud_cover_high", "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
      "relative_humidity_2m", "uv_index", "visibility",
    ].join(","),
    daily: [
      "weather_code", "temperature_2m_max", "temperature_2m_min", "apparent_temperature_max",
      "apparent_temperature_min", "sunrise", "sunset", "uv_index_max", "precipitation_sum",
      "precipitation_probability_max", "wind_speed_10m_max", "wind_gusts_10m_max",
      "wind_direction_10m_dominant",
    ].join(","),
    timezone: "auto",
    forecast_days: "14",
    wind_speed_unit: "kmh",
  });

  const [weatherRes, aqRes] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?${params}`),
    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.latitude}&longitude=${loc.longitude}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,european_aqi`).catch(() => null),
  ]);

  if (!weatherRes.ok) throw new Error("Weather fetch failed");
  const w = await weatherRes.json();
  let airQuality;
  if (aqRes && aqRes.ok) {
    const aq = await aqRes.json();
    airQuality = aq.current;
  }
  return { location: loc, current: w.current, hourly: w.hourly, daily: w.daily, airQuality };
}

// WMO weather interpretation
export function weatherInfo(code: number, isDay = 1): { label: string; icon: string } {
  const map: Record<number, { label: string; icon: string; nightIcon?: string }> = {
    0: { label: "Clear", icon: "☀️", nightIcon: "🌙" },
    1: { label: "Mostly clear", icon: "🌤️", nightIcon: "🌙" },
    2: { label: "Partly cloudy", icon: "⛅", nightIcon: "☁️" },
    3: { label: "Overcast", icon: "☁️" },
    45: { label: "Fog", icon: "🌫️" },
    48: { label: "Rime fog", icon: "🌫️" },
    51: { label: "Light drizzle", icon: "🌦️" },
    53: { label: "Drizzle", icon: "🌦️" },
    55: { label: "Heavy drizzle", icon: "🌧️" },
    56: { label: "Freezing drizzle", icon: "🌧️" },
    57: { label: "Freezing drizzle", icon: "🌧️" },
    61: { label: "Light rain", icon: "🌦️" },
    63: { label: "Rain", icon: "🌧️" },
    65: { label: "Heavy rain", icon: "🌧️" },
    66: { label: "Freezing rain", icon: "🌧️" },
    67: { label: "Freezing rain", icon: "🌧️" },
    71: { label: "Light snow", icon: "🌨️" },
    73: { label: "Snow", icon: "❄️" },
    75: { label: "Heavy snow", icon: "❄️" },
    77: { label: "Snow grains", icon: "❄️" },
    80: { label: "Rain showers", icon: "🌦️" },
    81: { label: "Rain showers", icon: "🌧️" },
    82: { label: "Violent rain", icon: "⛈️" },
    85: { label: "Snow showers", icon: "🌨️" },
    86: { label: "Snow showers", icon: "❄️" },
    95: { label: "Thunderstorm", icon: "⛈️" },
    96: { label: "Thunderstorm w/ hail", icon: "⛈️" },
    99: { label: "Severe thunderstorm", icon: "⛈️" },
  };
  const info = map[code] ?? { label: "Unknown", icon: "❓" };
  return { label: info.label, icon: !isDay && info.nightIcon ? info.nightIcon : info.icon };
}

export function windDirLabel(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

export function aqiCategory(aqi: number): { label: string; color: string } {
  if (aqi <= 20) return { label: "Very Good", color: "text-emerald-400" };
  if (aqi <= 40) return { label: "Good", color: "text-green-400" };
  if (aqi <= 60) return { label: "Moderate", color: "text-yellow-400" };
  if (aqi <= 80) return { label: "Poor", color: "text-orange-400" };
  if (aqi <= 100) return { label: "Very Poor", color: "text-red-400" };
  return { label: "Extremely Poor", color: "text-purple-400" };
}

export function uvCategory(uv: number): { label: string; color: string } {
  if (uv < 3) return { label: "Low", color: "text-green-400" };
  if (uv < 6) return { label: "Moderate", color: "text-yellow-400" };
  if (uv < 8) return { label: "High", color: "text-orange-400" };
  if (uv < 11) return { label: "Very High", color: "text-red-400" };
  return { label: "Extreme", color: "text-purple-400" };
}

export function moonPhase(date: Date): { name: string; icon: string; illumination: number } {
  // Approximate moon phase calculation
  const synodic = 29.53058867;
  const known = new Date("2000-01-06T18:14:00Z").getTime();
  const days = (date.getTime() - known) / 86400000;
  const phase = ((days % synodic) + synodic) % synodic;
  const frac = phase / synodic;
  const illum = Math.round((1 - Math.cos(2 * Math.PI * frac)) * 50);
  if (frac < 0.03 || frac > 0.97) return { name: "New Moon", icon: "🌑", illumination: illum };
  if (frac < 0.22) return { name: "Waxing Crescent", icon: "🌒", illumination: illum };
  if (frac < 0.28) return { name: "First Quarter", icon: "🌓", illumination: illum };
  if (frac < 0.47) return { name: "Waxing Gibbous", icon: "🌔", illumination: illum };
  if (frac < 0.53) return { name: "Full Moon", icon: "🌕", illumination: illum };
  if (frac < 0.72) return { name: "Waning Gibbous", icon: "🌖", illumination: illum };
  if (frac < 0.78) return { name: "Last Quarter", icon: "🌗", illumination: illum };
  return { name: "Waning Crescent", icon: "🌘", illumination: illum };
}
