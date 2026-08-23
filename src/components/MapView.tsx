import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { FeatureCollection, Point } from 'geojson';
import { KINDS, type Kind, type Place, type PlaceProps, type Visibility } from '../lib/types';

// maplibre-gl locates its worker script via a runtime `new URL(...)` that Vite/Rollup can't
// statically trace, so it never ends up in the build output on its own — the map would
// otherwise be blank with no tile requests and no error, since the worker silently fails to
// start. `?worker&url` routes the file through Vite's worker bundling pipeline, which inlines
// its `./maplibre-gl-shared.mjs` sibling import into one self-contained chunk and gives us
// its URL (plain `?url` copies the file verbatim without that sibling, which also fails).
maplibregl.setWorkerUrl(maplibreWorkerUrl);

const STYLE_URL = 'https://api.pdok.nl/kadaster/brt-achtergrondkaart/ogc/v1/styles/standaard__webmercatorquad?f=mapbox';
const NL_CENTER: [number, number] = [5.3, 52.2];
const NL_MAX_BOUNDS: [[number, number], [number, number]] = [[2.0, 50.0], [8.5, 54.3]];
const INITIAL_ZOOM = 6.5;
const SELECT_ZOOM = 14;
const MOBILE_BREAKPOINT = 768;
const MOBILE_SHEET_PADDING = 280;
const COLORS: Record<Kind, string> = { kastje: '#e63946', club: '#1d3557' };
const EMPTY: FeatureCollection<Point, PlaceProps> = { type: 'FeatureCollection', features: [] };

declare global {
  interface Window {
    __map?: MapLibreMap;
  }
}

interface Props {
  kastjes: Place[];
  clubs: Place[];
  visible: Visibility;
  selected: Place | null;
  onSelect: (place: Place | null) => void;
  onError: () => void;
}

const toCollection = (features: Place[]): FeatureCollection<Point, PlaceProps> => ({ type: 'FeatureCollection', features });

export function MapView({ kastjes, clubs, visible, selected, onSelect, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);

  // Latest callbacks/data without re-creating the map.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const placesRef = useRef<Place[]>([]);
  placesRef.current = [...kastjes, ...clubs];

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: NL_CENTER,
      zoom: INITIAL_ZOOM,
      maxBounds: NL_MAX_BOUNDS,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), 'top-right');

    let styleLoaded = false;
    map.once('style.load', () => {
      styleLoaded = true;
    });
    map.on('error', (e) => {
      console.error('maplibre error', e.error);
      if (!styleLoaded) onErrorRef.current();
    });

    const findPlace = (kind: Kind, id: unknown) =>
      placesRef.current.find((p) => p.properties.kind === kind && p.properties.id === id) ?? null;

    map.on('load', () => {
      KINDS.forEach((kind) => {
        map.addSource(kind, { type: 'geojson', data: EMPTY });
        map.addLayer({
          id: kind,
          type: 'circle',
          source: kind,
          paint: { 'circle-radius': 7, 'circle-color': COLORS[kind], 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
        });
        map.addLayer({
          id: `${kind}-selected`,
          type: 'circle',
          source: kind,
          filter: ['==', ['get', 'id'], ''],
          paint: { 'circle-radius': 13, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-width': 3, 'circle-stroke-color': COLORS[kind] },
        });
        map.on('click', kind, (e: MapLayerMouseEvent) => {
          const id = e.features?.[0]?.properties?.id;
          onSelectRef.current(findPlace(kind, id));
        });
        map.on('mouseenter', kind, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', kind, () => {
          map.getCanvas().style.cursor = '';
        });
      });
      map.on('click', (e) => {
        const hits = map.queryRenderedFeatures(e.point, { layers: [...KINDS] });
        if (hits.length === 0) onSelectRef.current(null);
      });
      setReady(true);
    });

    mapRef.current = map;
    window.__map = map;
    return () => {
      map.remove();
      mapRef.current = null;
      window.__map = undefined;
    };
  }, []);

  // Push data into sources.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource('kastje') as GeoJSONSource).setData(toCollection(kastjes));
    (map.getSource('club') as GeoJSONSource).setData(toCollection(clubs));
  }, [ready, kastjes, clubs]);

  // Layer visibility.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    KINDS.forEach((kind) => {
      const value = visible[kind] ? 'visible' : 'none';
      map.setLayoutProperty(kind, 'visibility', value);
      map.setLayoutProperty(`${kind}-selected`, 'visibility', value);
    });
  }, [ready, visible]);

  // Highlight + fly to selection.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    KINDS.forEach((kind) => {
      const id = selected?.properties.kind === kind ? selected.properties.id : '';
      map.setFilter(`${kind}-selected`, ['==', ['get', 'id'], id]);
    });
    if (selected) {
      const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
      map.flyTo({
        center: selected.geometry.coordinates as [number, number],
        zoom: Math.max(map.getZoom(), SELECT_ZOOM),
        padding: { top: 0, left: 0, right: 0, bottom: isMobile ? MOBILE_SHEET_PADDING : 0 },
      });
    }
  }, [ready, selected]);

  return <div ref={containerRef} className="map" aria-label="Kaart" />;
}
