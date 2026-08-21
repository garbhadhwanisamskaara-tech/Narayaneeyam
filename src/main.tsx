import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initAnalytics } from "./lib/analytics";

initAnalytics();


// Initialize Sentry safely — never block rendering
import("./monitoring/sentry")
  .then(({ initSentry }) => initSentry())
  .catch((e) => console.warn("Sentry initialization failed:", e));

// Register the push messaging service worker (feature-detected, non-blocking)
import("./lib/pushNotifications")
  .then(({ registerPushServiceWorker }) => registerPushServiceWorker())
  .catch((e) => console.warn("Push service worker registration failed:", e));

createRoot(document.getElementById("root")!).render(<App />);
