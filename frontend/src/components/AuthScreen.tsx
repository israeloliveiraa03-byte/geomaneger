import { FormEvent, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function AuthScreen({ onClose }: { onClose: () => void }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password, name);
      onClose();
    } catch (err: any) {
      setError(err.message || "Algo deu errado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>{mode === "login" ? "Entrar" : "Criar conta"}</h2>

        {mode === "register" && (
          <input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
        )}
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Senha (mín. 8 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
        </button>

        <p className="switch-mode">
          {mode === "login" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
          <a onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Cadastre-se" : "Entrar"}
          </a>
        </p>
      </form>
    </div>
  );
}
