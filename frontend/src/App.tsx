import { useCallback, useMemo, useState } from "react";
import { v4 as uuid } from "uuid";
import * as turf from "@turf/turf";
import MapCanvas from "./components/MapCanvas";
import LayerPanel from "./components/LayerPanel";
import ImportPanel from "./components/ImportPanel";
import AuthScreen from "./components/AuthScreen";
import PlansModal from "./components/PlansModal";
import MapsBar from "./components/MapsBar";
import { MapLayer, defaultStyle } from "./types";
import AttributePanel from "./components/AttributePanel";
import { useAuth, AuthProvider } from "./contexts/AuthContext";
import { api } from "./api/client";

function geometryKind(feature: GeoJSON.Feature): "point" | "line" | "polygon" {
  const t = feature.geometry.type;
  if (t.includes("Point")) return "point";
  if (t.includes("LineString")) return "line";
  return "polygon";
}

function Editor() {
  const { user, token, logout } = useAuth();
  const [layers, setLayers] = useState<MapLayer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [measurement, setMeasurement] = useState<string | null>(null);
  const [currentMapId, setCurrentMapId] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<{ layerId: string; index: number } | null>(null);

  const addLayer = useCallback((layer: MapLayer) => {
    setLayers((prev) => [...prev, layer]);
    setActiveLayerId(layer.id);
  }, []);

  // Toda forma desenhada no mapa vai para a camada ativa, ou cria uma nova "Desenho"
  const handleFeatureCreated = useCallback(
    (feature: GeoJSON.Feature) => {
      setLayers((prev) => {
        if (activeLayerId) {
          return prev.map((l) =>
            l.id === activeLayerId
              ? { ...l, geojson: { ...l.geojson, features: [...l.geojson.features, feature] } }
              : l
          );
        }
        const newLayer: MapLayer = {
          id: uuid(),
          name: "Novo desenho",
          type: geometryKind(feature),
          geojson: { type: "FeatureCollection", features: [feature] },
          visible: true,
          style: defaultStyle(prev.length),
          createdAt: Date.now()
        };
        setActiveLayerId(newLayer.id);
        return [...prev, newLayer];
      });

      if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") {
        const area = turf.area(feature as any);
        setMeasurement(`Área: ${(area / 10000).toFixed(2)} ha (${area.toFixed(0)} m²)`);
      } else if (feature.geometry.type === "LineString") {
        const length = turf.length(feature as any, { units: "kilometers" });
        setMeasurement(`Comprimento: ${length.toFixed(2)} km`);
      } else {
        setMeasurement(null);
      }
    },
    [activeLayerId]
  );

  const handleFeatureClick = useCallback((layerId: string, index: number) => {
    setSelectedFeature({ layerId, index });
  }, []);

  const handleSaveAttributes = (properties: Record<string, any>) => {
    if (!selectedFeature) return;
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== selectedFeature.layerId) return l;
        const features = l.geojson.features.map((f, i) =>
          i === selectedFeature.index ? { ...f, properties } : f
        );
        return { ...l, geojson: { ...l.geojson, features } };
      })
    );
    setSelectedFeature(null);
  };

  const handleDeleteFeature = () => {
    if (!selectedFeature) return;
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== selectedFeature.layerId) return l;
        const features = l.geojson.features.filter((_, i) => i !== selectedFeature.index);
        return { ...l, geojson: { ...l.geojson, features } };
      })
    );
    setSelectedFeature(null);
  };

  const toggleVisible = (id: string) =>
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));

  const deleteLayer = (id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (activeLayerId === id) setActiveLayerId(null);
  };

  const renameLayer = (id: string, name: string) =>
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)));

  const changeColor = (id: string, color: string) =>
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, style: { ...l.style, color } } : l)));

  const reorder = (id: string, direction: "up" | "down") =>
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      const swapWith = direction === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[swapWith]] = [copy[swapWith], copy[idx]];
      return copy;
    });

  const exportGeoJSON = () => {
    const combined: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: layers.flatMap((l) => l.geojson.features)
    };
    const blob = new Blob([JSON.stringify(combined, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mapa-geomanager.geojson";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateMap = (id: string, _title: string) => {
    setLayers([]);
    setActiveLayerId(null);
    setCurrentMapId(id);
  };

  const handleOpenMap = async (id: string) => {
    if (!token) return;
    const map = await api.getMap(token, id);
    setLayers(map.layers);
    setActiveLayerId(map.layers[0]?.id ?? null);
    setCurrentMapId(id);
  };

  const handleSaveMap = async () => {
    if (!token || !currentMapId) return;
    setSaving(true);
    try {
      await api.saveLayers(token, currentMapId, layers);
    } catch (err: any) {
      alert(err.message || "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const totalFeatures = useMemo(() => layers.reduce((sum, l) => sum + l.geojson.features.length, 0), [layers]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="brand">GeoManager</span>
        <ImportPanel onLayerCreated={addLayer} onExport={exportGeoJSON} layerCount={layers.length} />
        {user && (
          <MapsBar
            currentMapId={currentMapId}
            onOpenMap={handleOpenMap}
            onCreateMap={handleCreateMap}
            onSave={handleSaveMap}
            saving={saving}
          />
        )}
        <div className="header-stats">
          {totalFeatures} feições · {layers.length} camadas
          {measurement && <span className="measurement"> · {measurement}</span>}
        </div>
        <div className="account-area">
          {user ? (
            <>
              <button onClick={() => setShowPlans(true)}>
                Plano: {user.plan === "free" ? "Gratuito" : user.plan}
              </button>
              <button onClick={logout}>Sair ({user.name})</button>
            </>
          ) : (
            <button onClick={() => setShowAuth(true)}>Entrar / Criar conta</button>
          )}
        </div>
      </header>
      <div className="app-body">
        <LayerPanel
          layers={layers}
          activeLayerId={activeLayerId}
          onSelect={setActiveLayerId}
          onToggleVisible={toggleVisible}
          onDelete={deleteLayer}
          onRename={renameLayer}
          onColorChange={changeColor}
          onReorder={reorder}
        />
        <main className="map-area">
          <MapCanvas
            layers={layers}
            activeLayerId={activeLayerId}
            onFeatureCreated={handleFeatureCreated}
            onFeatureClick={handleFeatureClick}
          />
        </main>
        {selectedFeature && (
          <AttributePanel
            properties={
              layers.find((l) => l.id === selectedFeature.layerId)?.geojson.features[selectedFeature.index]
                ?.properties ?? {}
            }
            onSave={handleSaveAttributes}
            onClose={() => setSelectedFeature(null)}
            onDeleteFeature={handleDeleteFeature}
          />
        )}
      </div>
      {showAuth && <AuthScreen onClose={() => setShowAuth(false)} />}
      {showPlans && <PlansModal onClose={() => setShowPlans(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Editor />
    </AuthProvider>
  );
}

