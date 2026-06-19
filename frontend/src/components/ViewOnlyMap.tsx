import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapLayer } from "../types";

export default function ViewOnlyMap({ layers }: { layers: MapLayer[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { center: [-15.793889, -47.882778], zoom: 4 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; colaboradores do OpenStreetMap",
      maxZoom: 19
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || layers.length === 0) return;

    const group = L.featureGroup();
    for (const layer of layers) {
      const geoLayer = L.geoJSON(layer.geojson, {
        style: () => ({ color: layer.style.color, weight: layer.style.weight, fillOpacity: layer.style.fillOpacity }),
        pointToLayer: (_f, latlng) =>
          L.circleMarker(latlng, {
            radius: layer.style.radius,
            color: layer.style.color,
            fillColor: layer.style.color,
            fillOpacity: layer.style.fillOpacity,
            weight: layer.style.weight
          }),
        onEachFeature: (feature, leafletLayer) => {
          const props = feature.properties || {};
          const rows = Object.entries(props)
            .slice(0, 8)
            .map(([k, v]) => `<tr><td style="padding:2px 6px;color:#666">${k}</td><td style="padding:2px 6px">${v}</td></tr>`)
            .join("");
          if (rows) leafletLayer.bindPopup(`<table>${rows}</table>`);
        }
      });
      geoLayer.addTo(group);
    }
    group.addTo(map);
    if (group.getLayers().length > 0) map.fitBounds(group.getBounds(), { padding: [30, 30] });

    return () => {
      map.removeLayer(group);
    };
  }, [layers]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
