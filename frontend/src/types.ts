export type GeometryType = "point" | "line" | "polygon" | "mixed";

export interface LayerStyle {
  color: string;
  fillOpacity: number;
  weight: number;
  radius: number;
}

export interface MapLayer {
  id: string;
  name: string;
  type: GeometryType;
  geojson: GeoJSON.FeatureCollection;
  visible: boolean;
  style: LayerStyle;
  createdAt: number;
}

export const DEFAULT_PALETTE = [
  "#0F6E56",
  "#185FA5",
  "#993C1D",
  "#852FA0",
  "#A32D2D",
  "#5F5E5A"
];

export function defaultStyle(index: number): LayerStyle {
  return {
    color: DEFAULT_PALETTE[index % DEFAULT_PALETTE.length],
    fillOpacity: 0.35,
    weight: 3,
    radius: 7
  };
}
