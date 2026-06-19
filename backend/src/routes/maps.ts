import { Router } from "express";
import { pool } from "../db/pool";
import { requireAuth, AuthedRequest } from "../services/auth";

export const mapsRouter = Router();

mapsRouter.use(requireAuth);

mapsRouter.get("/", async (req: AuthedRequest, res) => {
  const result = await pool.query(
    "SELECT id, title, is_public, public_slug, updated_at FROM maps WHERE owner_id = $1 ORDER BY updated_at DESC",
    [req.userId]
  );
  res.json(result.rows);
});

mapsRouter.post("/", async (req: AuthedRequest, res) => {
  const planResult = await pool.query(
    `SELECT u.plan, pl.max_maps, (SELECT count(*) FROM maps WHERE owner_id = u.id) AS current_maps
     FROM users u JOIN plan_limits pl ON pl.plan = u.plan WHERE u.id = $1`,
    [req.userId]
  );
  const { max_maps, current_maps } = planResult.rows[0];
  if (Number(current_maps) >= max_maps) {
    return res.status(403).json({ error: "Limite de mapas do seu plano atingido. Faça upgrade para continuar." });
  }

  const { title } = req.body ?? {};
  const result = await pool.query(
    "INSERT INTO maps (owner_id, title) VALUES ($1, $2) RETURNING id, title, created_at",
    [req.userId, title || "Mapa sem título"]
  );
  res.status(201).json(result.rows[0]);
});

mapsRouter.delete("/:id", async (req: AuthedRequest, res) => {
  await pool.query("DELETE FROM maps WHERE id = $1 AND owner_id = $2", [req.params.id, req.userId]);
  res.sendStatus(204);
});

// Devolve um mapa com todas as camadas e feições (GeoJSON pronto para o editor)
mapsRouter.get("/:id", async (req: AuthedRequest, res) => {
  const mapResult = await pool.query("SELECT id, title FROM maps WHERE id = $1 AND owner_id = $2", [
    req.params.id,
    req.userId
  ]);
  if (!mapResult.rowCount) return res.status(404).json({ error: "Mapa não encontrado" });

  const layersResult = await pool.query(
    "SELECT id, name, geom_type, style, visible FROM map_layers WHERE map_id = $1 ORDER BY position ASC",
    [req.params.id]
  );

  const layers = [];
  for (const layer of layersResult.rows) {
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

  res.json({ id: mapResult.rows[0].id, title: mapResult.rows[0].title, layers });
});

// Substitui todas as camadas/feições do mapa pelo estado atual enviado pelo editor
mapsRouter.put("/:id/layers", async (req: AuthedRequest, res) => {
  const { layers } = req.body ?? {};
  if (!Array.isArray(layers)) return res.status(400).json({ error: "Formato inválido" });

  const owned = await pool.query("SELECT id FROM maps WHERE id = $1 AND owner_id = $2", [
    req.params.id,
    req.userId
  ]);
  if (!owned.rowCount) return res.status(404).json({ error: "Mapa não encontrado" });

  const limitCheck = await pool.query(
    `SELECT pl.max_features_per_map FROM users u JOIN plan_limits pl ON pl.plan = u.plan WHERE u.id = $1`,
    [req.userId]
  );
  const maxFeatures = limitCheck.rows[0]?.max_features_per_map ?? 200;
  const totalFeatures = layers.reduce((sum: number, l: any) => sum + (l.geojson?.features?.length ?? 0), 0);
  if (totalFeatures > maxFeatures) {
    return res.status(403).json({
      error: `Seu plano permite até ${maxFeatures} feições por mapa. Este mapa tem ${totalFeatures}. Faça upgrade para salvar tudo.`
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM map_layers WHERE map_id = $1", [req.params.id]);

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const layerResult = await client.query(
        `INSERT INTO map_layers (map_id, name, geom_type, style, position, visible)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [req.params.id, layer.name, layer.type, JSON.stringify(layer.style), i, layer.visible]
      );
      const layerId = layerResult.rows[0].id;

      for (const feature of layer.geojson?.features ?? []) {
        await client.query(
          `INSERT INTO map_features (layer_id, geom, properties)
           VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), $3)`,
          [layerId, JSON.stringify(feature.geometry), JSON.stringify(feature.properties ?? {})]
        );
      }
    }

    await client.query("UPDATE maps SET updated_at = now() WHERE id = $1", [req.params.id]);
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Falha ao salvar o mapa" });
  } finally {
    client.release();
  }
});

mapsRouter.patch("/:id/publish", async (req: AuthedRequest, res) => {
  const slug = `${req.params.id.slice(0, 8)}-${Date.now().toString(36)}`;
  const result = await pool.query(
    "UPDATE maps SET is_public = true, public_slug = $1 WHERE id = $2 AND owner_id = $3 RETURNING public_slug",
    [slug, req.params.id, req.userId]
  );
  if (!result.rowCount) return res.status(404).json({ error: "Mapa não encontrado" });
  res.json({ publicUrl: `${process.env.APP_URL}/m/${result.rows[0].public_slug}` });
});

mapsRouter.patch("/:id/unpublish", async (req: AuthedRequest, res) => {
  const result = await pool.query(
    "UPDATE maps SET is_public = false WHERE id = $1 AND owner_id = $2 RETURNING id",
    [req.params.id, req.userId]
  );
  if (!result.rowCount) return res.status(404).json({ error: "Mapa não encontrado" });
  res.json({ ok: true });
});
