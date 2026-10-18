import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import FestivalBanner from "@/components/FestivalBanner";

export function mountFestival(host: HTMLElement) {
  host.style.position = "relative";
  host.style.zIndex = "9999";
  host.style.padding = "24px";
  createRoot(host).render(
    <BrowserRouter>
      <FestivalBanner />
    </BrowserRouter>
  );
}
