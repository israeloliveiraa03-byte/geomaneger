declare module "togeojson" {
  export function kml(doc: Document): GeoJSON.FeatureCollection;
  export function gpx(doc: Document): GeoJSON.FeatureCollection;
  export function tcx(doc: Document): GeoJSON.FeatureCollection;
}
