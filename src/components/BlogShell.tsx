import { Link } from "react-router-dom";
import logoImg from "@/assets/logo.png";

export default function BlogShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-gradient-peacock shadow-peacock">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <img src={logoImg} alt="Narayaneeyam Logo" className="h-9 w-9 rounded-full object-cover bg-transparent" />
            <div className="min-w-0">
              <h1 className="font-display text-base lg:text-lg font-semibold text-primary-foreground leading-tight truncate">Sriman Narayaneeyam</h1>
              <p className="text-[10px] lg:text-xs text-gold-light font-sans hidden sm:block">From Our Blog</p>
            </div>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4 text-sm font-sans">
            <Link to="/blog" className="text-primary-foreground/80 hover:text-secondary transition-colors">Blog</Link>
            <Link to="/" className="text-primary-foreground/80 hover:text-secondary transition-colors">Home</Link>
            <Link to="/auth" className="rounded-lg bg-secondary/90 px-3 py-1.5 text-secondary-foreground hover:bg-secondary transition-colors font-semibold">Sign In</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full">{children}</main>

      <footer className="bg-gradient-peacock text-primary-foreground/80 py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-sm font-sans">
          <p className="mb-2">© {new Date().getFullYear()} Sriman Narayaneeyam · Chant · Learn · Grow</p>
          <div className="flex items-center justify-center gap-4 text-xs">
            <Link to="/blog" className="hover:text-secondary">Blog</Link>
            <Link to="/about" className="hover:text-secondary">About</Link>
            <Link to="/faq" className="hover:text-secondary">FAQ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
