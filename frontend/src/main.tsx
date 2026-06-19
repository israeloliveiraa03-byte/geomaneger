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
