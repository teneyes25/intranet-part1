"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Phone, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface StoreLocatorItem {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  businessHours?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  code: string;
}

interface StoreLocatorProps {
  stores: StoreLocatorItem[];
}

declare global {
  interface Window {
    naver?: {
      maps: {
        Map: new (el: HTMLElement, opts: object) => NaverMap;
        LatLng: new (lat: number, lng: number) => NaverLatLng;
        Marker: new (opts: object) => NaverMarker;
        InfoWindow: new (opts: object) => NaverInfoWindow;
        Event: { addListener: (target: unknown, event: string, fn: () => void) => void };
      };
    };
  }
}

interface NaverLatLng {
  lat: () => number;
  lng: () => number;
}

interface NaverMap {
  setCenter: (latlng: NaverLatLng) => void;
  getCenter: () => NaverLatLng;
}

interface NaverMarker {
  setMap: (map: NaverMap | null) => void;
  getPosition: () => NaverLatLng;
}

interface NaverInfoWindow {
  open: (map: NaverMap, marker: NaverMarker) => void;
  close: () => void;
}

const MAP_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ?? "";

function hasCoords(store: StoreLocatorItem) {
  return store.latitude != null && store.longitude != null;
}

function infoHtml(store: StoreLocatorItem) {
  const parts = [
    `<strong>${store.name}</strong>`,
    store.address ? `<div>${store.address}</div>` : "",
    store.phone ? `<div>☎ ${store.phone}</div>` : "",
    store.businessHours ? `<div>🕐 ${store.businessHours}</div>` : "",
    `<div style="font-size:11px;color:#666">코드 ${store.code}</div>`,
  ];
  return `<div style="padding:8px;line-height:1.5;font-size:13px">${parts.filter(Boolean).join("")}</div>`;
}

export function StoreLocator({ stores }: StoreLocatorProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<NaverMap | null>(null);
  const markersRef = useRef<{ marker: NaverMarker; store: StoreLocatorItem }[]>([]);
  const infoWindowRef = useRef<NaverInfoWindow | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const mappable = useMemo(() => stores.filter(hasCoords), [stores]);

  const focusStore = useCallback((store: StoreLocatorItem) => {
    if (!mapInstance.current || !window.naver?.maps) return;
    if (store.latitude == null || store.longitude == null) return;

    setSelectedId(store.id);
    const pos = new window.naver.maps.LatLng(store.latitude, store.longitude);
    mapInstance.current.setCenter(pos);

    const entry = markersRef.current.find((m) => m.store.id === store.id);
    if (entry && infoWindowRef.current) {
      infoWindowRef.current.close();
      infoWindowRef.current.open(mapInstance.current, entry.marker);
    }
  }, []);

  useEffect(() => {
    if (!MAP_CLIENT_ID) {
      setMapError("지도 API 키(NEXT_PUBLIC_NAVER_MAP_CLIENT_ID)가 설정되지 않았습니다.");
      return;
    }

    const existing = document.querySelector('script[data-naver-maps="v3"]');
    if (existing) {
      if (window.naver?.maps) setMapReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/v3/maps.js?ncpClientId=${MAP_CLIENT_ID}`;
    script.async = true;
    script.dataset.naverMaps = "v3";
    script.onload = () => setMapReady(true);
    script.onerror = () => setMapError("네이버 지도를 불러오지 못했습니다.");
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.naver?.maps) return;

    const defaultCenter =
      mappable.length > 0
        ? new window.naver.maps.LatLng(mappable[0]!.latitude!, mappable[0]!.longitude!)
        : new window.naver.maps.LatLng(37.4979, 127.0276);

    const map = new window.naver.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 12,
    });
    mapInstance.current = map;
    infoWindowRef.current = new window.naver.maps.InfoWindow({ maxWidth: 280 });

    markersRef.current = mappable.map((store) => {
      const position = new window.naver!.maps.LatLng(store.latitude!, store.longitude!);
      const marker = new window.naver!.maps.Marker({ position, map, title: store.name });
      window.naver!.maps.Event.addListener(marker, "click", () => focusStore(store));
      return { marker, store };
    });

    if (mappable.length > 0) {
      setSelectedId(mappable[0]!.id);
    }

    return () => {
      markersRef.current.forEach(({ marker }) => marker.setMap(null));
      markersRef.current = [];
      mapInstance.current = null;
    };
  }, [mapReady, mappable, focusStore]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="relative min-h-[360px] overflow-hidden rounded-xl border bg-muted/30">
        {mapError ? (
          <div className="flex h-full min-h-[360px] items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {mapError}
          </div>
        ) : (
          <div ref={mapRef} className="h-full min-h-[360px] w-full" aria-label="매장 지도" />
        )}
      </div>

      <aside className="max-h-[480px] space-y-2 overflow-y-auto rounded-xl border bg-card p-2">
        <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
          매장 목록 ({stores.length})
        </p>
        {stores.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">등록된 매장이 없습니다.</p>
        ) : (
          stores.map((store) => (
            <button
              key={store.id}
              type="button"
              onClick={() => hasCoords(store) && focusStore(store)}
              disabled={!hasCoords(store)}
              className={cn(
                "w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                selectedId === store.id
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:bg-muted/50",
                !hasCoords(store) && "cursor-not-allowed opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{store.name}</span>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {store.code}
                </Badge>
              </div>
              {store.address && (
                <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                  {store.address}
                </p>
              )}
              {store.phone && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3 shrink-0" />
                  {store.phone}
                </p>
              )}
              {store.businessHours && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 shrink-0" />
                  {store.businessHours}
                </p>
              )}
              {!hasCoords(store) && (
                <p className="mt-1 text-[10px] text-amber-600">좌표 미등록 — 지도 표시 불가</p>
              )}
            </button>
          ))
        )}
      </aside>
    </div>
  );
}
