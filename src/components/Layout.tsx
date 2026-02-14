import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Mic, FileText, GraduationCap, LayoutDashboard, Menu, X, CalendarPlus } from "lucide-react";
import { useState } from "react";

const navItems = [
  { path: "/", label: "Home", icon: LayoutDashboard },
  { path: "/chant", label: "Chant with Me", icon: Mic },
  { path: "/learn", label: "Learn with Me", icon: GraduationCap },
  { path: "/script", label: "Script Library", icon: FileText },
  { path: "/lesson-plan", label: "Lesson Plan", icon: CalendarPlus },
  { path: "/dashboard", label: "Dashboard", icon: BookOpen },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 bg-gradient-peacock shadow-peacock">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-gold">
              <span className="font-display text-lg font-bold text-primary">ॐ</span>
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold text-primary-foreground leading-tight">
                Sriman Narayaneeyam
              </h1>
              <p className="text-xs text-gold-light font-sans">Chant · Learn · Grow</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-sans transition-colors ${
                    isActive
                      ? "text-secondary"
                      : "text-primary-foreground/70 hover:text-primary-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-lg bg-primary-foreground/10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden text-primary-foreground p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden border-t border-primary-foreground/10 px-4 pb-4"
          >
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-sans ${
                    isActive
                      ? "text-secondary bg-primary-foreground/10"
                      : "text-primary-foreground/70"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </motion.nav>
        )}
      </header>

      <main>{children}</main>
    </div>
  );
}
