import { Router } from "express";
import { pool } from "../db/pool";

export const publicMapsRouter = Router();

// Sem autenticação — qualquer pessoa com o link pode ver um mapa publicado
publicMapsRouter.get("/:slug", async (req, res) => {
  const mapResult = await pool.query(
    "SELECT id, title FROM maps WHERE public_slug = $1 AND is_public = true",
    [req.params.slug]
  );
  if (!mapResult.rowCount) return res.status(404).json({ error: "Mapa não encontrado ou não está público" });

  const map = mapResult.rows[0];

  const layersResult = await pool.query(
    "SELECT id, name, geom_type, style, visible FROM map_layers WHERE map_id = $1 ORDER BY position ASC",
    [map.id]
  );

  const layers = [];
  for (const layer of layersResult.rows) {
    if (!layer.visible) continue;
    const featuresResult = await pool.query(
      "SELECT ST_AsGeoJSON(geom) AS geometry, properties FROM map_features WHERE layer_id = $1",
      [layer.id]
    );
    layers.push({
      id: layer.id,
      name: layer.name,
      type: layer.geom_type,
      visible: layer.visible,
      style: layer.style,
      geojson: {
        type: "FeatureCollection",
        features: featuresResult.rows.map((f) => ({
          type: "Feature",
          geometry: JSON.parse(f.geometry),
          properties: f.properties
        }))
      }
    });
  }

  res.json({ title: map.title, layers });
});
