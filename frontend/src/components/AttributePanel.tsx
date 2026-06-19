import { useState } from "react";

interface Props {
  properties: Record<string, any>;
  onSave: (properties: Record<string, any>) => void;
  onClose: () => void;
  onDeleteFeature: () => void;
}

export default function AttributePanel({ properties, onSave, onClose, onDeleteFeature }: Props) {
  const [rows, setRows] = useState<[string, string][]>(
    Object.entries(properties || {}).map(([k, v]) => [k, String(v ?? "")])
  );
  const [newKey, setNewKey] = useState("");

  function updateValue(index: number, value: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? [row[0], value] : row)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function addRow() {
    if (!newKey.trim()) return;
    setRows((prev) => [...prev, [newKey.trim(), ""]]);
    setNewKey("");
  }

  function handleSave() {
    const properties: Record<string, string> = {};
    for (const [k, v] of rows) {
      if (k.trim()) properties[k.trim()] = v;
    }
    onSave(properties);
  }

  return (
    <div className="attribute-panel">
      <div className="attribute-panel-header">
        <h2>Atributos da feição</h2>
        <button onClick={onClose} title="Fechar">✕</button>
      </div>

      {rows.length === 0 && <p className="empty-hint">Esta feição ainda não tem atributos. Adicione um abaixo.</p>}

      <div className="attribute-rows">
        {rows.map(([key, value], i) => (
          <div className="attribute-row" key={i}>
            <span className="attribute-key">{key}</span>
            <input value={value} onChange={(e) => updateValue(i, e.target.value)} />
            <button onClick={() => removeRow(i)} title="Remover atributo">✕</button>
          </div>
        ))}
      </div>

      <div className="attribute-add">
        <input
          placeholder="Novo campo (ex: nome, categoria)"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addRow()}
        />
        <button onClick={addRow}>+ Adicionar</button>
      </div>

      <div className="attribute-actions">
        <button className="primary" onClick={handleSave}>Salvar atributos</button>
        <button className="danger" onClick={onDeleteFeature}>Excluir feição</button>
      </div>
    </div>
  );
}
