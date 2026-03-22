import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize Sentry safely — never block rendering
import("./monitoring/sentry")
  .then(({ initSentry }) => initSentry())
  .catch((e) => console.warn("Sentry initialization failed:", e));

createRoot(document.getElementById("root")!).render(<App />);
