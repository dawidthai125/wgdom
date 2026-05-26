import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./app/App.tsx";
import "./styles/index.css";
import { registerServiceWorker } from "./lib/pwa-install";

registerServiceWorker();
createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Analytics />
  </>,
);