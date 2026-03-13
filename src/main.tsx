import { createRoot } from "react-dom/client";
import { initSentry } from "./monitoring/sentry";
import App from "./App.tsx";
import "./index.css";

// Initialize Sentry before rendering
initSentry();

createRoot(document.getElementById("root")!).render(<App />);
