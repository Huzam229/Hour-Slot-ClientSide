'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './LocationMap.module.css';

/** Fix default marker icons under Next.js bundling. */
function ensureDefaultIcon() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proto = L.Icon.Default.prototype as any;
  if (proto._getIconUrl) {
    delete proto._getIconUrl;
  }
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

export interface MapMarker {
  id?: string | number;
  lat: number;
  lng: number;
  label?: string;
}

interface LocationMapProps {
  markers: MapMarker[];
  /** Live GPS pin, drawn distinctly from business markers. */
  userLocation?: { lat: number; lng: number } | null;
  height?: number | string;
  zoom?: number;
  className?: string;
  /** When true, fit bounds to all markers */
  fitMarkers?: boolean;
  selectedId?: string | number | null;
  onMarkerClick?: (id: string | number) => void;
  showControls?: boolean;
  onLocate?: () => void;
  scrollWheelZoom?: boolean;
}

function idsMatch(a: string | number | null | undefined, b: string | number | null | undefined) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

function pinIcon(selected: boolean) {
  const fill = selected ? '#1d4ed8' : '#3b82f6';
  const w = selected ? 27 : 24;
  const h = selected ? 40 : 36;
  return L.divIcon({
    className: `${styles.pin} ${selected ? styles.pinOn : ''}`,
    html: `<svg class="${styles.pinSvg}" width="${w}" height="${h}" viewBox="0 0 24 36" aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9.5 12 24 12 24s12-14.5 12-24C24 5.373 18.627 0 12 0z" fill="${fill}"/>
      <circle cx="12" cy="12" r="4.4" fill="#fff"/>
    </svg>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h + 4],
  });
}

function userLocationIcon() {
  return L.divIcon({
    className: styles.userMarker,
    html: `<span class="${styles.userMarkerRing}"></span><span class="${styles.userMarkerDot}"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -12],
  });
}

function infoWindowHtml(label: string) {
  const parts = label
    .split(/<br\s*\/?>/i)
    .map((part) => part.trim())
    .filter(Boolean);
  const title = parts[0] || label;
  const lines = parts.slice(1);
  return `<div class="${styles.infoCard}">
    <p class="${styles.infoTitle}">${title}</p>
    ${lines.map((line) => `<p class="${styles.infoLine}">${line}</p>`).join('')}
  </div>`;
}

const INFO_POPUP: L.PopupOptions = {
  className: 'hs-info-popup',
  closeButton: true,
  autoPan: true,
  maxWidth: 260,
  minWidth: 168,
  offset: [0, -4],
};

function isMapAlive(map: L.Map | null | undefined): map is L.Map {
  if (!map) return false;
  const pane = (map as unknown as { _mapPane?: HTMLElement | null })._mapPane;
  if (!pane) return false;
  try {
    const el = map.getContainer();
    return Boolean(el && el.isConnected);
  } catch {
    return false;
  }
}

function safeInvalidateSize(map: L.Map | null | undefined) {
  if (!isMapAlive(map)) return;
  try {
    map.invalidateSize({ animate: false });
  } catch {
    /* Leaflet already torn down */
  }
}

/** Read-only Leaflet map showing one or more pins. */
export default function LocationMap({
  markers,
  userLocation = null,
  height = 280,
  zoom = 13,
  className = '',
  fitMarkers = true,
  selectedId = null,
  onMarkerClick,
  showControls = false,
  onLocate,
  scrollWheelZoom = false,
}: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const clickRef = useRef(onMarkerClick);
  clickRef.current = onMarkerClick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    ensureDefaultIcon();

    const center =
      markers.length > 0
        ? L.latLng(markers[0].lat, markers[0].lng)
        : userLocation && Number.isFinite(userLocation.lat) && Number.isFinite(userLocation.lng)
          ? L.latLng(userLocation.lat, userLocation.lng)
          : L.latLng(37.7749, -122.4194);

    const map = L.map(containerRef.current, {
      scrollWheelZoom,
      attributionControl: true,
      zoomControl: !showControls,
    }).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const onResize = () => {
      if (cancelled) return;
      safeInvalidateSize(map);
    };
    timers.push(setTimeout(onResize, 50));
    window.addEventListener('resize', onResize);
    let lastW = 0;
    let lastH = 0;
    const ro =
      typeof ResizeObserver !== 'undefined' && wrapRef.current
        ? new ResizeObserver((entries) => {
            if (cancelled) return;
            const cr = entries[0]?.contentRect;
            if (!cr) return;
            const w = Math.round(cr.width);
            const h = Math.round(cr.height);
            if (w === lastW && h === lastH) return;
            lastW = w;
            lastH = h;
            safeInvalidateSize(map);
          })
        : null;
    if (ro && wrapRef.current) {
      ro.observe(wrapRef.current);
    }

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const latLngs: L.LatLng[] = [];

    markers.forEach((m) => {
      if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng)) return;
      const ll = L.latLng(m.lat, m.lng);
      latLngs.push(ll);
      const selected = idsMatch(m.id, selectedId);
      const marker = L.marker(ll, {
        icon: pinIcon(selected),
        zIndexOffset: selected ? 600 : 0,
        riseOnHover: true,
      });
      if (m.label) {
        marker.bindPopup(infoWindowHtml(m.label), INFO_POPUP);
      }
      if (m.id != null) {
        marker.on('click', () => clickRef.current?.(m.id as string | number));
      }
      marker.addTo(layer);
      if (selected && m.label) {
        marker.openPopup();
      }
    });

    if (userLocation && Number.isFinite(userLocation.lat) && Number.isFinite(userLocation.lng)) {
      const you = L.latLng(userLocation.lat, userLocation.lng);
      latLngs.push(you);
      L.marker(you, {
        icon: userLocationIcon(),
        zIndexOffset: 400,
        keyboard: false,
      })
        .bindPopup(infoWindowHtml('<strong>You are here</strong>'), INFO_POPUP)
        .addTo(layer);
    }

    if (latLngs.length === 1) {
      map.setView(latLngs[0], zoom);
    } else if (latLngs.length > 1 && fitMarkers) {
      map.fitBounds(L.latLngBounds(latLngs).pad(0.2));
    }

    const t = setTimeout(() => safeInvalidateSize(map), 80);
    return () => clearTimeout(t);
  }, [markers, userLocation?.lat, userLocation?.lng, zoom, fitMarkers, selectedId]);

  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div ref={wrapRef} className={`${styles.mapWrap} ${className}`} style={{ height: heightStyle }}>
      <div ref={containerRef} className={styles.map} />
      {showControls && (
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.ctrlBtn}
            aria-label="Use my location"
            onClick={() => onLocate?.()}
          >
            <i className="fa-solid fa-location-crosshairs" />
          </button>
          <button
            type="button"
            className={styles.ctrlBtn}
            aria-label="Zoom in"
            onClick={() => mapRef.current?.zoomIn()}
          >
            +
          </button>
          <button
            type="button"
            className={styles.ctrlBtn}
            aria-label="Zoom out"
            onClick={() => mapRef.current?.zoomOut()}
          >
            −
          </button>
        </div>
      )}
    </div>
  );
}

interface LocationPickerProps {
  address: string;
  latitude: number;
  longitude: number;
  onAddressChange: (address: string) => void;
  onCoordinatesChange: (lat: number, lng: number) => void;
  height?: number;
  /** When true, keep the provided coordinates instead of geocoding the address on open. */
  skipInitialGeocode?: boolean;
}

/**
 * Interactive map picker: type an address to geocode + pin,
 * drag the pin (or edit lat/lng) for precise coordinates.
 */
export function LocationPicker({
  address,
  latitude,
  longitude,
  onAddressChange,
  onCoordinatesChange,
  height = 260,
  skipInitialGeocode = false,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextGeocode = useRef(
    skipInitialGeocode || (Number.isFinite(latitude) && Number.isFinite(longitude))
  );
  const seededAddress = useRef(address);
  const [geocoding, setGeocoding] = useState(false);
  const [geoHint, setGeoHint] = useState<string | null>(null);

  const setMarkerPosition = useCallback((lat: number, lng: number, pan = true) => {
    const map = mapRef.current;
    if (!map) return;
    ensureDefaultIcon();
    const ll = L.latLng(lat, lng);
    if (!markerRef.current) {
      const marker = L.marker(ll, { draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        skipNextGeocode.current = true;
        onCoordinatesChange(
          Number(p.lat.toFixed(6)),
          Number(p.lng.toFixed(6))
        );
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng(ll);
    }
    if (pan) map.setView(ll, Math.max(map.getZoom(), 14));
  }, [onCoordinatesChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    ensureDefaultIcon();

    const startLat = Number.isFinite(latitude) ? latitude : 37.7749;
    const startLng = Number.isFinite(longitude) ? longitude : -122.4194;
    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
      [startLat, startLng],
      14
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      skipNextGeocode.current = true;
      onCoordinatesChange(
        Number(e.latlng.lat.toFixed(6)),
        Number(e.latlng.lng.toFixed(6))
      );
    });

    mapRef.current = map;
    setMarkerPosition(startLat, startLng, false);
    let cancelled = false;
    const t = setTimeout(() => {
      if (!cancelled) safeInvalidateSize(map);
    }, 80);

    return () => {
      cancelled = true;
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    setMarkerPosition(latitude, longitude, true);
  }, [latitude, longitude, setMarkerPosition]);

  const geocodeAddress = useCallback(
    async (query: string) => {
      if (!query.trim() || query.trim().length < 4) return;
      setGeocoding(true);
      setGeoHint(null);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query.trim())}`;
        const res = await fetch(url, {
          headers: { Accept: 'application/json' },
        });
        const data = (await res.json()) as { lat: string; lon: string; display_name?: string }[];
        if (data?.[0]) {
          const lat = Number(Number(data[0].lat).toFixed(6));
          const lng = Number(Number(data[0].lon).toFixed(6));
          skipNextGeocode.current = true;
          onCoordinatesChange(lat, lng);
          setGeoHint('Pinned from address — drag the marker to fine-tune.');
        } else {
          setGeoHint('No match found. Type a fuller address or place the pin manually.');
        }
      } catch {
        setGeoHint('Geocoding failed. Set the pin on the map or enter coordinates.');
      } finally {
        setGeocoding(false);
      }
    },
    [onCoordinatesChange]
  );

  useEffect(() => {
    if (skipNextGeocode.current) {
      skipNextGeocode.current = false;
      return;
    }
    if (skipInitialGeocode && address === seededAddress.current) {
      return;
    }
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => {
      geocodeAddress(address);
    }, 900);
    return () => {
      if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    };
  }, [address, geocodeAddress, skipInitialGeocode]);

  return (
    <div className={styles.picker}>
      <div className="form-group">
        <label className="form-label" htmlFor="map-address">
              Address / location
            </label>
        <input
          id="map-address"
          type="text"
          className="input-field"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="Start typing an address…"
          autoComplete="street-address"
        />
        <span className={styles.hint}>
          {geocoding ? 'Looking up location…' : geoHint || 'Map updates when you pause typing. Drag the pin for accuracy.'}
        </span>
      </div>

      <div
        ref={containerRef}
        className={styles.map}
        style={{ height }}
        aria-label="Location map"
      />

      <div className={styles.coordsRow}>
        <div className="form-group">
          <label className="form-label" htmlFor="map-lat">
              Latitude
            </label>
          <input
            id="map-lat"
            type="number"
            step="0.000001"
            className="input-field"
            value={Number.isFinite(latitude) ? latitude : ''}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v)) {
                skipNextGeocode.current = true;
                onCoordinatesChange(v, longitude);
              }
            }}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="map-lng">
              Longitude
            </label>
          <input
            id="map-lng"
            type="number"
            step="0.000001"
            className="input-field"
            value={Number.isFinite(longitude) ? longitude : ''}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v)) {
                skipNextGeocode.current = true;
                onCoordinatesChange(latitude, v);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
