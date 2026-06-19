import { MapLayer } from "../types";

interface Props {
  layers: MapLayer[];
  activeLayerId: string | null;
  onSelect: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onColorChange: (id: string, color: string) => void;
  onReorder: (id: string, direction: "up" | "down") => void;
}

export default function LayerPanel({
  layers,
  activeLayerId,
  onSelect,
  onToggleVisible,
  onDelete,
  onRename,
  onColorChange,
  onReorder
}: Props) {
  return (
    <div className="layer-panel">
      <h2>Camadas</h2>
      {layers.length === 0 && <p className="empty-hint">Importe um arquivo ou desenhe no mapa para criar sua primeira camada.</p>}
      <ul>
        {layers.map((layer, idx) => (
          <li key={layer.id} className={layer.id === activeLayerId ? "active" : ""} onClick={() => onSelect(layer.id)}>
            <input
              type="checkbox"
              checked={layer.visible}
              onChange={(e) => {
                e.stopPropagation();
                onToggleVisible(layer.id);
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <input
              type="color"
              value={layer.style.color}
              onChange={(e) => onColorChange(layer.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="color-swatch"
            />
            <input
              className="layer-name"
              value={layer.name}
              onChange={(e) => onRename(layer.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="feature-count">{layer.geojson.features.length}</span>
            <button
              title="Mover para cima"
              onClick={(e) => {
                e.stopPropagation();
                onReorder(layer.id, "up");
              }}
              disabled={idx === 0}
            >
              ↑
            </button>
            <button
              title="Mover para baixo"
              onClick={(e) => {
                e.stopPropagation();
                onReorder(layer.id, "down");
              }}
              disabled={idx === layers.length - 1}
            >
              ↓
            </button>
            <button
              title="Excluir camada"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(layer.id);
              }}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
