import { Link, useLocation } from "react-router-dom";
import { Home, Mic, GraduationCap, Headphones, User } from "lucide-react";

const bottomNavItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/chant", label: "Chant", icon: Mic },
  { path: "/learn", label: "Learn", icon: GraduationCap },
  { path: "/podcast", label: "Podcast", icon: Headphones },
  { path: "/dashboard", label: "Profile", icon: User },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border lg:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {bottomNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[56px] ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
              <span className={`text-[10px] font-sans ${isActive ? "font-semibold" : ""}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
