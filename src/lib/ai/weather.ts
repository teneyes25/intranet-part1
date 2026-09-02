import "server-only";

/** 서울 기준 Open-Meteo 현재 날씨 (API 키 불필요) */
export async function fetchSeoulWeatherSummary(): Promise<string | null> {
  try {
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.978&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FSeoul";
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      current?: {
        temperature_2m?: number;
        relative_humidity_2m?: number;
        weather_code?: number;
        wind_speed_10m?: number;
        time?: string;
      };
    };
    const c = data.current;
    if (!c) return null;
    const desc = weatherCodeKo(c.weather_code ?? 0);
    return [
      `관측 시각(서울): ${c.time ?? "-"}`,
      `날씨: ${desc}`,
      `기온: ${c.temperature_2m ?? "-"}°C`,
      `습도: ${c.relative_humidity_2m ?? "-"}%`,
      `풍속: ${c.wind_speed_10m ?? "-"} km/h`,
      "(출처: Open-Meteo)",
    ].join("\n");
  } catch (e) {
    console.error("[weather]", e);
    return null;
  }
}

function weatherCodeKo(code: number): string {
  const map: Record<number, string> = {
    0: "맑음",
    1: "대체로 맑음",
    2: "부분적으로 흐림",
    3: "흐림",
    45: "안개",
    48: "착빙 안개",
    51: "이슬비",
    61: "비",
    63: "비(보통)",
    65: "강한 비",
    71: "눈",
    80: "소나기",
    95: "뇌우",
  };
  return map[code] ?? `코드 ${code}`;
}
