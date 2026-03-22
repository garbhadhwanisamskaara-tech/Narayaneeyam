import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize Sentry safely — never block rendering
try {
  const { initSentry } = await import("./monitoring/sentry");
  initSentry();
} catch (e) {
  console.warn("Sentry initialization failed:", e);
}

createRoot(document.getElementById("root")!).render(<App />);
