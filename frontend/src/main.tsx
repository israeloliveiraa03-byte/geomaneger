import { Buffer } from "buffer";
// shpjs (leitor de Shapefile) espera encontrar Buffer global, igual no Node.js —
// isso não existe no navegador por padrão, então fornecemos manualmente.
(window as any).Buffer = Buffer;

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import PublicMapView from "./components/PublicMapView";
import "./styles/global.css";

const publicMatch = window.location.pathname.match(/^\/m\/(.+)$/);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {publicMatch ? <PublicMapView slug={publicMatch[1]} /> : <App />}
  </React.StrictMode>
);