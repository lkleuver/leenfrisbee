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
// Bosrand palette (see styles.css): sea-green kastjes, gold club rings, ink for the selection.
const ACCENT = "#4fb59f";
const CLUB = "#c9b26a";
const INK = "#1d1b17";
const PAPER = "#fbf9f2";
const SEA = "#cddcd6";
const LAND = "#eeebe0";
const KASTJE_ICON = "kastje-icon";
const KASTJE_SELECTED_ICON = "kastje-selected-icon";
const CLUB_RADIUS = 7;
const CLUB_RADIUS_OFF = 3.5;
// The PDOK standaard style has no background layer (the ocean just stops at the tile edge) and
// its default palette clashes with ours. We fetch the style JSON, remap every colour onto the
// Speelveld palette, and prepend a sea-coloured background — the NL land fill on top of it
// gives a crisp country silhouette for free.
const RECOLOR: Record<string, string> = {
  "#FFFFFF": LAND, // land, rail dashes, tunnel casings, A-road numbers
  "#80BDE3": SEA, // sea, lakes, waterways
  "#90C0E4": "#bfd2cc", // tidal flats
  "#004DE3": "#3a7268", // water labels
  "#FDF6BB": "#ece5cc", // sand
  "#DDA1C1": "#d9cba4", // heath
  "#C3DBB5": "#d3dbc3", // forest
  "#E3DCE7": "#e4e1d4", // built-up area
  "#D1D1D1": "#d3d0c2", // buildings
  "#F9E11E": "#e9d68f", // motorways
  "#FCEF84": "#f1e8c4", // secondary roads
  "#E69800": "#c4ad74", // road casings
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
// Kastje marker: a rounded box with a frisbee in it (matches `.mk--kastje` in styles.css).
// Drawn on a 2x canvas so it stays crisp on retina screens.
const drawKastjeIcon = (size: number, fill: string, halo: number): ImageData => {
  const scale = 2;
  const total = (size + halo * 2) * scale;
  const canvas = document.createElement("canvas");
  canvas.width = total;
  canvas.height = total;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d canvas context unavailable");
  ctx.scale(scale, scale);
  const c = halo + size / 2;
  const radius = size * 0.28;
  if (halo > 0) {
    ctx.fillStyle = "rgba(29,27,23,0.18)";
    ctx.beginPath();
    ctx.roundRect(0, 0, size + halo * 2, size + halo * 2, radius + halo);
    ctx.fill();
  }
  ctx.fillStyle = fill;
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = size >= 30 ? 3 : 2;
  ctx.beginPath();
  ctx.roundRect(halo + ctx.lineWidth / 2, halo + ctx.lineWidth / 2, size - ctx.lineWidth, size - ctx.lineWidth, radius);
  ctx.fill();
  ctx.stroke();
  const disc = [
    { r: size * 0.2, color: PAPER },
    { r: size * 0.12, color: ACCENT },
    { r: size * 0.05, color: PAPER },
  ];
  disc.forEach(({ r, color }) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.fill();
  });
  return ctx.getImageData(0, 0, total, total);
};

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
        popupRef.current = new maplibregl.Popup({ offset: 18 })
          .setLngLat(place.geometry.coordinates as [number, number])
          .setDOMContent(el)
          .addTo(map);
      };

      map.on("load", () => {
        map.addImage(KASTJE_ICON, drawKastjeIcon(24, ACCENT, 0), { pixelRatio: 2 });
        map.addImage(KASTJE_SELECTED_ICON, drawKastjeIcon(36, INK, 6), { pixelRatio: 2 });
        map.addSource("club-link", { type: "geojson", data: EMPTY });
        map.addLayer({
          id: "club-link",
          type: "line",
          source: "club-link",
          paint: {
            "line-color": ACCENT,
            "line-width": 2,
            "line-dasharray": [1.5, 2],
          },
        });
        KINDS.forEach((kind) => {
          map.addSource(kind, { type: "geojson", data: EMPTY });
        });
        // Clubs: open gold ring. Drawn first so kastjes sit on top where they overlap.
        map.addLayer({
          id: "club",
          type: "circle",
          source: "club",
          paint: {
            "circle-radius": CLUB_RADIUS,
            "circle-color": PAPER,
            "circle-stroke-width": 4,
            "circle-stroke-color": CLUB,
          },
        });
        map.addLayer({
          id: "club-selected",
          type: "circle",
          source: "club",
          filter: ["==", ["get", "id"], ""],
          paint: {
            "circle-radius": 12,
            "circle-color": PAPER,
            "circle-stroke-width": 5,
            "circle-stroke-color": INK,
          },
        });
        // Kastjes: box-with-frisbee icon.
        map.addLayer({
          id: "kastje",
          type: "symbol",
          source: "kastje",
          layout: {
            "icon-image": KASTJE_ICON,
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
        });
        map.addLayer({
          id: "kastje-selected",
          type: "symbol",
          source: "kastje",
          filter: ["==", ["get", "id"], ""],
          layout: {
            "icon-image": KASTJE_SELECTED_ICON,
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
        });
        KINDS.forEach((kind) => {
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
    map.setPaintProperty("club", "circle-radius", visible.club ? CLUB_RADIUS : CLUB_RADIUS_OFF);
    map.setPaintProperty("club", "circle-stroke-width", visible.club ? 4 : 2);
  }, [ready, visible]);

  // Highlight + fly to selection.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const linkedClub =
      selected?.properties.club_id &&
      clubs.find((c) => c.properties.id === selected.properties.club_id);
    (map.getSource("club-link") as GeoJSONSource).setData(
      selected && linkedClub
        ? {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: [
                    selected.geometry.coordinates,
                    linkedClub.geometry.coordinates,
                  ],
                },
              },
            ],
          }
        : EMPTY,
    );
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
  }, [ready, selected, clubs]);

  return <div ref={containerRef} className="map" aria-label="Kaart" />;
}
