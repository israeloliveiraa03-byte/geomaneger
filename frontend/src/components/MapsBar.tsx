import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../contexts/AuthContext";

interface SavedMap {
  id: string;
  title: string;
  updated_at: string;
}

interface Props {
  currentMapId: string | null;
  onOpenMap: (id: string) => void;
  onCreateMap: (id: string, title: string) => void;
  onSave: () => Promise<void>;
  saving: boolean;
}

export default function MapsBar({ currentMapId, onOpenMap, onCreateMap, onSave, saving }: Props) {
  const { token } = useAuth();
  const [maps, setMaps] = useState<SavedMap[]>([]);
  const [open, setOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  async function refresh() {
    if (!token) return;
    setMaps(await api.listMaps(token));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleNewMap() {
    if (!token) return;
    const title = prompt("Nome do novo mapa:", "Mapa sem título");
    if (title === null) return;
    try {
      const created = await api.createMap(token, title);
      onCreateMap(created.id, title);
      refresh();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handlePublish() {
    if (!token || !currentMapId) return;
    setPublishing(true);
    try {
      await onSave();
      const { publicUrl } = await api.publishMap(token, currentMapId);
      await navigator.clipboard.writeText(publicUrl).catch(() => {});
      alert(`Mapa publicado! Link copiado para a área de transferência:\n${publicUrl}`);
    } catch (err: any) {
      alert(err.message || "Não foi possível publicar o mapa");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="maps-bar">
      <button onClick={() => setOpen((v) => !v)}>Meus mapas</button>
      <button onClick={handleNewMap}>+ Novo mapa</button>
      {currentMapId && (
        <>
          <button onClick={onSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
          <button onClick={handlePublish} disabled={publishing}>
            {publishing ? "Publicando..." : "Publicar"}
          </button>
        </>
      )}
      {open && (
        <div className="maps-dropdown">
          {maps.length === 0 && <p className="empty-hint">Nenhum mapa salvo ainda.</p>}
          {maps.map((m) => (
            <div
              key={m.id}
              className={`maps-dropdown-item ${m.id === currentMapId ? "active" : ""}`}
              onClick={() => {
                onOpenMap(m.id);
                setOpen(false);
              }}
            >
              {m.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
