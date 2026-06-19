import Papa from "papaparse";
import * as toGeoJSON from "togeojson";
import shp from "shpjs";

function detectGeometryType(fc: GeoJSON.FeatureCollection): "point" | "line" | "polygon" | "mixed" {
  const kinds = new Set(
    fc.features.map((f) => {
      const t = f.geometry?.type ?? "";
      if (t.includes("Point")) return "point";
      if (t.includes("LineString")) return "line";
      if (t.includes("Polygon")) return "polygon";
      return "mixed";
    })
  );
  if (kinds.size === 1) return [...kinds][0] as any;
  return "mixed";
}

export interface ImportResult {
  geojson: GeoJSON.FeatureCollection;
  type: "point" | "line" | "polygon" | "mixed";
  warnings: string[];
}

// CSV: tenta detectar colunas de latitude/longitude automaticamente
export function importCSV(text: string): ImportResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true
  });

  const warnings: string[] = [];
  const headers = parsed.meta.fields ?? [];

  const latKey = headers.find((h) => /^(lat|latitude|y)$/i.test(h.trim()));
  const lonKey = headers.find((h) => /^(lon|lng|long|longitude|x)$/i.test(h.trim()));

  if (!latKey || !lonKey) {
    warnings.push(
      "Não encontramos colunas de latitude/longitude automaticamente. Renomeie as colunas para 'lat' e 'lon' (ou 'latitude'/'longitude')."
    );
    return { geojson: { type: "FeatureCollection", features: [] }, type: "point", warnings };
  }

  const features: GeoJSON.Feature[] = [];
  for (const row of parsed.data) {
    const lat = parseFloat(row[latKey]);
    const lon = parseFloat(row[lonKey]);
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue;

    const properties: Record<string, string> = {};
    for (const key of headers) {
      if (key !== latKey && key !== lonKey) properties[key] = row[key];
    }

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties
    });
  }

  if (features.length === 0) {
    warnings.push("Nenhuma linha válida com coordenadas foi encontrada.");
  }

  return {
    geojson: { type: "FeatureCollection", features },
    type: "point",
    warnings
  };
}

export function importGeoJSON(text: string): ImportResult {
  const parsed = JSON.parse(text);
  const fc: GeoJSON.FeatureCollection =
    parsed.type === "FeatureCollection"
      ? parsed
      : { type: "FeatureCollection", features: [parsed.type === "Feature" ? parsed : { type: "Feature", geometry: parsed, properties: {} }] };

  return { geojson: fc, type: detectGeometryType(fc), warnings: [] };
}

export function importKML(text: string): ImportResult {
  const dom = new DOMParser().parseFromString(text, "text/xml");
  const fc = toGeoJSON.kml(dom) as GeoJSON.FeatureCollection;
  return { geojson: fc, type: detectGeometryType(fc), warnings: [] };
}

export function importGPX(text: string): ImportResult {
  const dom = new DOMParser().parseFromString(text, "text/xml");
  const fc = toGeoJSON.gpx(dom) as GeoJSON.FeatureCollection;
  return { geojson: fc, type: detectGeometryType(fc), warnings: [] };
}

export async function importShapefile(buffer: ArrayBuffer): Promise<ImportResult> {
  const result = await shp(buffer);
  // shpjs devolve uma FeatureCollection, ou um array delas se o zip tiver várias camadas —
  // nesse caso juntamos tudo numa só camada (o usuário pode separar manualmente depois)
  const fc: GeoJSON.FeatureCollection = Array.isArray(result)
    ? { type: "FeatureCollection", features: result.flatMap((r) => r.features) }
    : result;

  return { geojson: fc, type: detectGeometryType(fc), warnings: [] };
}

export async function importFile(file: File): Promise<ImportResult> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "zip" || ext === "shp") {
    try {
      const buffer = await file.arrayBuffer();
      return await importShapefile(buffer);
    } catch (err) {
      return {
        geojson: { type: "FeatureCollection", features: [] },
        type: "mixed",
        warnings: [
          "Não conseguimos ler esse Shapefile. Verifique se o .zip contém os arquivos .shp, .dbf e .prj juntos (são exportados em conjunto pela maioria dos programas de SIG)."
        ]
      };
    }
  }

  const text = await file.text();

  switch (ext) {
    case "csv":
      return importCSV(text);
    case "json":
    case "geojson":
      return importGeoJSON(text);
    case "kml":
      return importKML(text);
    case "gpx":
      return importGPX(text);
    default:
      return {
        geojson: { type: "FeatureCollection", features: [] },
        type: "mixed",
        warnings: [
          `Formato ".${ext}" não suportado nesta versão. Formatos aceitos: CSV, GeoJSON, KML, GPX e Shapefile (.zip).`
        ]
      };
  }
}
