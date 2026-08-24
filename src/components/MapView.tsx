import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapLayerMouseEvent,
  StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { FeatureCollection, Point } from "geojson";
import type { Strings } from "../lib/i18n";
import {
  KINDS,
  type Kind,
  type Place,
  type PlaceProps,
  type Visibility,
} from "../lib/types";

// maplibre-gl locates its worker script via a runtime `new URL(...)` that Vite/Rollup can't
// statically trace, so it never ends up in the build output on its own — the map would
// otherwise be blank with no tile requests and no error, since the worker silently fails to
// start. `?worker&url` routes the file through Vite's worker bundling pipeline, which inlines
// its `./maplibre-gl-shared.mjs` sibling import into one self-contained chunk and gives us
// its URL (plain `?url` copies the file verbatim without that sibling, which also fails).
maplibregl.setWorkerUrl(maplibreWorkerUrl);

const STYLE_URL =
  "https://api.pdok.nl/kadaster/brt-achtergrondkaart/ogc/v1/styles/standaard__webmercatorquad?f=mapbox";
const NL_CENTER: [number, number] = [5.3, 52.2];
const NL_MAX_BOUNDS: [[number, number], [number, number]] = [
  [2.0, 50.0],
  [8.5, 54.3],
];
const INITIAL_ZOOM = 6.5;
const SELECT_ZOOM = 14;
const MOBILE_BREAKPOINT = 768;
// Mirrors `.panel { height: 60vh }` in styles.css, so the flyTo padding covers the sheet.
const MOBILE_SHEET_RATIO = 0.6;
const COLORS: Record<Kind, string> = { kastje: "#ff7a1a", club: "#c9e85c" };
const MARKER_STROKE = "#14452f"; // dark rim keeps both disc colours visible on the light basemap
const SEA = "#a8ccc3";
const LAND = "#f0f2e6";
// The PDOK standaard style has no background layer (the ocean just stops at the tile edge) and
// its default palette clashes with ours. We fetch the style JSON, remap every colour onto the
// Speelveld palette, and prepend a sea-coloured background — the NL land fill on top of it
// gives a crisp country silhouette for free.
const RECOLOR: Record<string, string> = {
  "#FFFFFF": "#f0f2e6", // land, rail dashes, tunnel casings, A-road numbers
  "#80BDE3": SEA, // sea, lakes, waterways
  "#90C0E4": "#b9d6cb", // tidal flats
  "#004DE3": "#3a7268", // water labels
  "#FDF6BB": "#efe9c2", // sand
  "#DDA1C1": "#d9cba4", // heath
  "#C3DBB5": "#b9cfa6", // forest
  "#E3DCE7": "#e3e0d0", // built-up area
  "#D1D1D1": "#cdcbbb", // buildings
  "#F9E11E": "#efd75c", // motorways
  "#FCEF84": "#f4e9a6", // secondary roads
  "#E69800": "#c9993b", // road casings
  "#FF7F7F": "#b9873b", // A-road number halo
  "#FFFFBE": "#f0ecc6", // N-road number halo
  "#000000": "#23301f", // place-name text
  "#828282": "#7f857b",
  "#808080": "#7f857b",
  "#A4A4A4": "#9fa495",
  "#B2B2B2": "#afb4a5",
};
const recolor = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(recolor);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [k, recolor(x)]),
    );
  return typeof v === "string" ? (RECOLOR[v.toUpperCase()] ?? v) : v;
};
async function loadStyle(): Promise<StyleSpecification> {
  const res = await fetch(STYLE_URL);
  if (!res.ok) throw new Error(`PDOK style request failed: ${res.status}`);
  const style = recolor(await res.json()) as StyleSpecification;
  const layers = (style.layers ?? []).map((layer) =>
    // The low-zoom 'nederland' features carry vistext values the PDOK match doesn't list
    // (e.g. "Nederland"), which fall through to transparent - paint land explicitly instead.
    layer.type === "fill" && layer["source-layer"] === "nederland"
      ? { ...layer, paint: { "fill-color": ["match", ["get", "vistext"], "(zee)water", SEA, LAND] as unknown as string } }
      : layer,
  );
  return {
    ...style,
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": SEA },
      },
      ...layers,
    ],
  };
}
const EMPTY: FeatureCollection<Point, PlaceProps> = {
  type: "FeatureCollection",
  features: [],
};

declare global {
  interface Window {
    __map?: MapLibreMap;
  }
}

interface Props {
  t: Strings;
  kastjes: Place[];
  clubs: Place[];
  visible: Visibility;
  selected: Place | null;
  onSelect: (place: Place | null) => void;
  onError: () => void;
}

const toCollection = (
  features: Place[],
): FeatureCollection<Point, PlaceProps> => ({
  type: "FeatureCollection",
  features,
});

export function MapView({
  kastjes,
  clubs,
  t,
  visible,
  selected,
  onSelect,
  onError,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);

  // Latest callbacks/data without re-creating the map.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const tRef = useRef(t);
  tRef.current = t;
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const placesRef = useRef<Place[]>([]);
  placesRef.current = [...kastjes, ...clubs];

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let cancelled = false;
    let map: MapLibreMap | null = null;

    // Recoloured style when the fetch works; plain style URL as fallback so the map still
    // renders (in default PDOK colours) if the transform path fails.
    loadStyle()
      .catch((err: unknown) => {
        console.error(
          "map style recolor failed, falling back to default style",
          err,
        );
        return STYLE_URL;
      })
      .then((style) => {
        if (cancelled) return;
        map = createMap(container, style);
        mapRef.current = map;
        window.__map = map;
      });

    const createMap = (
      target: HTMLDivElement,
      style: StyleSpecification | string,
    ) => {
      const map = new maplibregl.Map({
        container: target,
        style,
        center: NL_CENTER,
        zoom: INITIAL_ZOOM,
        maxBounds: NL_MAX_BOUNDS,
        attributionControl: { compact: true },
      });
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
      map.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
        }),
        "top-right",
      );

      let styleLoaded = false;
      map.once("style.load", () => {
        styleLoaded = true;
      });
      map.on("error", (e) => {
        console.error("maplibre error", e.error);
        if (!styleLoaded) onErrorRef.current();
      });

      const findPlace = (kind: Kind, id: unknown) =>
        placesRef.current.find(
          (p) => p.properties.kind === kind && p.properties.id === id,
        ) ?? null;

      // Built with DOM APIs (not innerHTML) so CSV-sourced text can never inject markup.
      const showPopup = (place: Place) => {
        popupRef.current?.remove();
        const props = place.properties;
        const el = document.createElement("div");
        el.className = "popup";
        const kindEl = document.createElement("p");
        kindEl.className = "popup__kind";
        kindEl.textContent = props.kind === "kastje" ? tRef.current.kastje : tRef.current.club;
        const nameEl = document.createElement("p");
        nameEl.className = "popup__name";
        nameEl.textContent = props.naam;
        const townEl = document.createElement("p");
        townEl.className = "popup__town";
        townEl.textContent = props.plaats;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn popup__btn";
        btn.textContent = tRef.current.details;
        btn.addEventListener("click", () => {
          popupRef.current?.remove();
          onSelectRef.current(place);
        });
        el.append(kindEl, nameEl, townEl, btn);
        popupRef.current = new maplibregl.Popup({ offset: 14 })
          .setLngLat(place.geometry.coordinates as [number, number])
          .setDOMContent(el)
          .addTo(map);
      };

      map.on("load", () => {
        KINDS.forEach((kind) => {
          map.addSource(kind, { type: "geojson", data: EMPTY });
          map.addLayer({
            id: kind,
            type: "circle",
            source: kind,
            paint: {
              "circle-radius": 7,
              "circle-color": COLORS[kind],
              "circle-stroke-width": 2,
              "circle-stroke-color": MARKER_STROKE,
            },
          });
          map.addLayer({
            id: `${kind}-selected`,
            type: "circle",
            source: kind,
            filter: ["==", ["get", "id"], ""],
            paint: {
              "circle-radius": 13,
              "circle-color": "rgba(0,0,0,0)",
              "circle-stroke-width": 3,
              "circle-stroke-color": MARKER_STROKE,
            },
          });
          map.on("click", kind, (e: MapLayerMouseEvent) => {
            const id = e.features?.[0]?.properties?.id;
            const place = findPlace(kind, id);
            if (place) showPopup(place);
          });
          map.on("mouseenter", kind, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", kind, () => {
            map.getCanvas().style.cursor = "";
          });
        });
        map.on("click", (e) => {
          const hits = map.queryRenderedFeatures(e.point, {
            layers: [...KINDS],
          });
          if (hits.length === 0) onSelectRef.current(null);
        });
        setReady(true);
      });

      return map;
    };

    return () => {
      cancelled = true;
      popupRef.current?.remove();
      popupRef.current = null;
      map?.remove();
      mapRef.current = null;
      window.__map = undefined;
    };
  }, []);

  // Push data into sources.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource("kastje") as GeoJSONSource).setData(toCollection(kastjes));
    (map.getSource("club") as GeoJSONSource).setData(toCollection(clubs));
  }, [ready, kastjes, clubs]);

  // Layer visibility. Kastjes hide entirely; clubs shrink to small dots when
  // toggled off so they stay discoverable (and clickable) on the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const kastjeVis = visible.kastje ? "visible" : "none";
    map.setLayoutProperty("kastje", "visibility", kastjeVis);
    map.setLayoutProperty("kastje-selected", "visibility", kastjeVis);
    map.setPaintProperty("club", "circle-radius", visible.club ? 7 : 3.5);
    map.setPaintProperty("club", "circle-stroke-width", visible.club ? 2 : 1);
  }, [ready, visible]);

  // Highlight + fly to selection.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    KINDS.forEach((kind) => {
      const id =
        selected?.properties.kind === kind ? selected.properties.id : "";
      map.setFilter(`${kind}-selected`, ["==", ["get", "id"], id]);
    });
    if (selected) {
      const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
      map.flyTo({
        center: selected.geometry.coordinates as [number, number],
        zoom: Math.max(map.getZoom(), SELECT_ZOOM),
        padding: {
          top: 0,
          left: 0,
          right: 0,
          bottom: isMobile
            ? Math.round(window.innerHeight * MOBILE_SHEET_RATIO)
            : 0,
        },
      });
    }
  }, [ready, selected]);

  return <div ref={containerRef} className="map" aria-label="Kaart" />;
}
