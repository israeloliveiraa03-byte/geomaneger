import { useRef } from "react";
import { importFile } from "../utils/importers";
import { MapLayer, defaultStyle } from "../types";
import { v4 as uuid } from "uuid";

interface Props {
  onLayerCreated: (layer: MapLayer) => void;
  onExport: () => void;
  layerCount: number;
}

export default function ImportPanel({ onLayerCreated, onExport, layerCount }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const result = await importFile(file);
    if (result.warnings.length > 0) {
      alert(result.warnings.join("\n"));
    }
    if (result.geojson.features.length === 0) return;

    const layer: MapLayer = {
      id: uuid(),
      name: file.name.replace(/\.[^/.]+$/, ""),
      type: result.type,
      geojson: result.geojson,
      visible: true,
      style: defaultStyle(layerCount),
      createdAt: Date.now()
    };
    onLayerCreated(layer);
  }

  return (
    <div className="toolbar">
      <button
        onClick={() => inputRef.current?.click()}
      >
        Importar arquivo (CSV, GeoJSON, KML, GPX, Shapefile .zip)
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.json,.geojson,.kml,.gpx,.zip,.shp"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <button onClick={onExport}>Exportar como GeoJSON</button>
    </div>
  );
}
