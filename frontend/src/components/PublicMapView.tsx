import { useEffect, useState } from "react";
import ViewOnlyMap from "./ViewOnlyMap";
import { MapLayer } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function PublicMapView({ slug }: { slug: string }) {
  const [title, setTitle] = useState("");
  const [layers, setLayers] = useState<MapLayer[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/public-maps/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Mapa não encontrado ou não está mais público.");
        return res.json();
      })
      .then((data) => {
        setTitle(data.title);
        setLayers(data.layers);
      })
      .catch((err) => setError(err.message));
  }, [slug]);

  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif" }}>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "10px 18px", borderBottom: "1px solid #DEDACE", fontFamily: "sans-serif", fontSize: 14 }}>
        <strong>{title || "Carregando..."}</strong>
        <span style={{ marginLeft: 12, color: "#5B6660" }}>publicado com GeoManager</span>
      </header>
      <div style={{ position: "relative", flex: 1 }}>
        <ViewOnlyMap layers={layers} />
      </div>
    </div>
  );
}
