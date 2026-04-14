import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, Mic, Headphones, Menu, X, LogIn, LogOut, User, Sun, Moon, LifeBuoy, Info, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import logoImg from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import SubscriptionBanner from "@/components/SubscriptionBanner";

const navItems = [
  { path: "/", label: "Home", icon: LayoutDashboard },
  { path: "/chant", label: "Chant", icon: Mic },
  { path: "/podcast", label: "Podcast", icon: Headphones },
  { path: "/faq", label: "FAQ", icon: Info },
  { path: "/user-manual", label: "Blog", icon: BookOpen },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") || localStorage.getItem("theme") === "dark";
    }
    return false;
  });
  const { user, displayName, signOut, loading, isEmailVerified, isTrialExpired } = useAuth();

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  useEffect(() => {
    if (loading) return;
    const path = location.pathname;
    if (path === "/auth" || path === "/reset-password") return;
    // Auth checks temporarily disabled for testing
    // if (!user) { navigate("/auth", { replace: true }); return; }
    // if (!isEmailVerified && path !== "/verify-email") { navigate("/verify-email", { replace: true }); return; }
    // if (isEmailVerified && isTrialExpired && path !== "/trial-expired") { navigate("/trial-expired", { replace: true }); return; }
    // if (isEmailVerified && !isTrialExpired) {
    //   if (path === "/verify-email" || path === "/trial-expired") navigate("/", { replace: true });
    // }
  }, [loading, user, isEmailVerified, isTrialExpired, location.pathname, navigate]);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") { document.documentElement.classList.add("dark"); setIsDark(true); }
    else { document.documentElement.classList.remove("dark"); }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-gradient-peacock shadow-peacock">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full overflow-hidden">
              <img src={logoImg} alt="Narayaneeyam Logo" className="h-full w-full rounded-full object-cover" />
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold text-primary-foreground leading-tight">Sriman Narayaneeyam</h1>
              <p className="text-xs text-gold-light font-sans">Chant · Learn · Grow · Podcast</p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}
                  className={`relative flex items-center gap-2 px-3 py-2 text-sm font-sans transition-colors ${isActive ? "text-secondary font-semibold" : "text-primary-foreground/70 hover:text-primary-foreground"}`}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {isActive && (
                    <motion.div layoutId="nav-underline" className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-secondary" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            {user && (
              <Link to="/support" className="flex items-center justify-center rounded-lg p-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors" title="Support">
                <LifeBuoy className="h-4 w-4" />
              </Link>
            )}
            <button onClick={toggleTheme} className="flex items-center justify-center rounded-lg p-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors" title={isDark ? "Morning Mode" : "Night Mode"}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {!loading && user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-primary-foreground/10 px-3 py-1.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground"><User className="h-4 w-4" /></div>
                  <span className="text-sm font-sans text-primary-foreground font-medium max-w-[120px] truncate">{displayName}</span>
                </div>
                <button onClick={() => signOut()} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-sans text-primary-foreground/60 hover:text-primary-foreground transition-colors" title="Sign out">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : !loading ? (
              <Link to="/auth" className="flex items-center gap-2 rounded-lg bg-secondary/90 px-4 py-2 text-sm font-sans font-semibold text-secondary-foreground hover:bg-secondary transition-colors">
                <LogIn className="h-4 w-4" /> Sign In
              </Link>
            ) : null}
          </div>

          <div className="lg:hidden flex items-center gap-2">
            {!loading && user && (
              <Link to="/support" className="text-primary-foreground/70 hover:text-primary-foreground p-2 transition-colors" title="Support"><LifeBuoy className="h-5 w-5" /></Link>
            )}
            {!loading && user && (
              <button onClick={() => signOut()} className="text-primary-foreground/70 hover:text-primary-foreground p-2 transition-colors" title="Sign out"><LogOut className="h-5 w-5" /></button>
            )}
            <button className="text-primary-foreground p-2" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <motion.nav initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="lg:hidden border-t border-primary-foreground/10 px-4 pb-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-sans ${isActive ? "text-secondary font-semibold border-l-2 border-secondary" : "text-primary-foreground/70"}`}>
                  <item.icon className="h-4 w-4" /> {item.label}
                </Link>
              );
            })}
            <button onClick={toggleTheme} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-sans text-primary-foreground/70">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {isDark ? "Morning Mode" : "Night Mode"}
            </button>
            <div className="mt-2 pt-2 border-t border-primary-foreground/10">
              {user ? (
                <div className="flex items-center justify-between px-3 py-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-secondary" />
                    <span className="text-sm font-sans text-primary-foreground">{displayName}</span>
                  </div>
                  <button onClick={() => { signOut(); setMobileOpen(false); }} className="text-xs text-primary-foreground/60 font-sans">Sign Out</button>
                </div>
              ) : (
                <Link to="/auth" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-sans text-secondary">
                  <LogIn className="h-4 w-4" /> Sign In / Sign Up
                </Link>
              )}
            </div>
          </motion.nav>
        )}
      </header>

      <SubscriptionBanner />
      <main className="pb-16 lg:pb-0">{children}</main>
      <BottomNav />
    </div>
  );
}
