import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet-draw";
import { MapLayer } from "../types";

interface Props {
  layers: MapLayer[];
  activeLayerId: string | null;
  onFeatureCreated: (feature: GeoJSON.Feature) => void;
  onFeatureClick: (layerId: string, featureIndex: number) => void;
}

export default function MapCanvas({ layers, activeLayerId, onFeatureCreated, onFeatureClick }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layerGroupsRef = useRef<Record<string, L.GeoJSON>>({});
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-15.793889, -47.882778],
      zoom: 4
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; colaboradores do OpenStreetMap",
      maxZoom: 19
    }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    const drawControl = new (L.Control as any).Draw({
      edit: { featureGroup: drawnItems },
      draw: {
        polygon: { allowIntersection: false, showArea: true },
        polyline: true,
        marker: true,
        circle: false,
        circlemarker: false,
        rectangle: true
      }
    });
    map.addControl(drawControl);

    map.on((L as any).Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      const feature = layer.toGeoJSON();
      onFeatureCreated(feature);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincroniza camadas de dados com o mapa sempre que `layers` mudar
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(layers.map((l) => l.id));

    // remove camadas que não existem mais
    for (const id of Object.keys(layerGroupsRef.current)) {
      if (!currentIds.has(id)) {
        map.removeLayer(layerGroupsRef.current[id]);
        delete layerGroupsRef.current[id];
      }
    }

    for (const layer of layers) {
      const existing = layerGroupsRef.current[layer.id];
      if (existing) map.removeLayer(existing);

      if (!layer.visible) continue;

      let featureIndex = -1;
      const geoLayer = L.geoJSON(layer.geojson, {
        style: () => ({
          color: layer.style.color,
          weight: layer.style.weight,
          fillOpacity: layer.style.fillOpacity
        }),
        pointToLayer: (_feature, latlng) =>
          L.circleMarker(latlng, {
            radius: layer.style.radius,
            color: layer.style.color,
            fillColor: layer.style.color,
            fillOpacity: layer.style.fillOpacity,
            weight: layer.style.weight
          }),
        onEachFeature: (feature, leafletLayer) => {
          featureIndex += 1;
          const idx = featureIndex;
          const props = feature.properties || {};
          const rows = Object.entries(props)
            .slice(0, 8)
            .map(([k, v]) => `<tr><td style="padding:2px 6px;color:#666">${k}</td><td style="padding:2px 6px">${v}</td></tr>`)
            .join("");
          if (rows) leafletLayer.bindPopup(`<table>${rows}</table>`);
          leafletLayer.on("click", () => onFeatureClick(layer.id, idx));
        }
      });

      geoLayer.addTo(map);
      layerGroupsRef.current[layer.id] = geoLayer;
    }
  }, [layers, onFeatureClick]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
