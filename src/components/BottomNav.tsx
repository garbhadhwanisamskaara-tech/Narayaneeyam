import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Mic, Headphones, BarChart3, MoreHorizontal } from "lucide-react";
import MoreMenu from "@/components/MoreMenu";

const bottomNavItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/chant", label: "Chant", icon: Mic },
  { path: "/podcast", label: "Podcast", icon: Headphones },
  { path: "/progress", label: "Progress", icon: BarChart3 },
];

export default function BottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const morePaths = ["/script", "/heart-shelf", "/saved-places", "/support"];
  const isMoreActive = morePaths.includes(location.pathname);

  return (
    <>
      <MoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} />
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border lg:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMoreOpen(false)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[56px] ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                <span className={`text-[10px] font-sans ${isActive ? "font-semibold" : ""}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[56px] ${
              isMoreActive || moreOpen ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className={`text-[10px] font-sans ${isMoreActive ? "font-semibold" : ""}`}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
