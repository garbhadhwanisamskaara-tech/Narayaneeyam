import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import BlogShell from "@/components/BlogShell";
import InstagramFollow from "@/components/InstagramFollow";
import { supabase } from "@/integrations/supabase/client";

interface BlogListItem {
  slug: string;
  title: string;
  excerpt: string | null;
}

async function fetchPosts(): Promise<BlogListItem[]> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug, title, excerpt")
    .eq("is_published", true)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data as BlogListItem[]) ?? [];
}

export default function BlogIndexPage() {
  const { data, isLoading } = useQuery({ queryKey: ["blog-posts"], queryFn: fetchPosts });
  const posts = data ?? [];

  return (
    <BlogShell>
      <Helmet>
        <title>Narayaneeyam Blog — Devotional Articles & Chanting Guides | Narayaneeyam App</title>
        <meta
          name="description"
          content="Read devotional articles, chanting guides, and beginner tutorials on Sriman Narayaneeyam — the 1036-verse hymn to Lord Guruvayurappan."
        />
        <meta property="og:title" content="Narayaneeyam Blog — Devotional Articles & Chanting Guides" />
        <meta property="og:description" content="Articles, guides and personal stories from devotees of Sriman Narayaneeyam." />
        <meta property="og:url" content="https://narayaneeyam.app/blog" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://narayaneeyam.app/blog" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Narayaneeyam Blog",
          url: "https://narayaneeyam.app/blog",
          publisher: { "@type": "Organization", name: "Narayaneeyam App", url: "https://narayaneeyam.app" },
          blogPost: posts.map((p) => ({
            "@type": "BlogPosting",
            headline: p.title,
            description: p.excerpt,
            url: `https://narayaneeyam.app/blog/${p.slug}`,
          })),
        })}</script>
      </Helmet>

      <article className="max-w-3xl mx-auto px-5 py-10">
        <header className="text-center mb-10">
          <span className="text-xs font-sans uppercase tracking-[0.2em] text-secondary">From Our Blog</span>
          <h1 className="font-display text-3xl sm:text-4xl text-primary mt-3 mb-3">Narayaneeyam Blog</h1>
          <div className="mx-auto h-[2px] w-20 bg-gradient-gold rounded-full" />
          <div className="mt-4 flex justify-center">
            <InstagramFollow variant="inline" label="Follow us" size={18} />
          </div>

          <p className="mt-5 text-foreground/70 font-sans leading-relaxed">
            Devotional articles, chanting guides and personal stories from devotees of Sriman Narayaneeyam.
          </p>
        </header>

        {isLoading ? (
          <ul className="space-y-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="rounded-xl border border-gold bg-card p-6 animate-pulse">
                <div className="h-5 w-2/3 rounded bg-muted mb-3" />
                <div className="h-4 w-full rounded bg-muted mb-2" />
                <div className="h-4 w-4/5 rounded bg-muted" />
              </li>
            ))}
          </ul>
        ) : posts.length === 0 ? (
          <p className="text-center font-sans text-foreground/60 py-10">
            No articles published yet. Please check back soon.
          </p>
        ) : (
          <ul className="space-y-5">
            {posts.map((p) => (
              <li
                key={p.slug}
                className="rounded-xl border border-gold bg-card p-6 hover:shadow-gold transition-shadow"
              >
                <h2 className="font-display text-xl text-primary mb-2">
                  <Link to={`/blog/${p.slug}`} className="hover:text-secondary transition-colors">
                    {p.title}
                  </Link>
                </h2>
                <p className="font-sans text-sm text-foreground/75 leading-relaxed mb-3">{p.excerpt}</p>
                <Link
                  to={`/blog/${p.slug}`}
                  className="inline-flex items-center text-sm font-sans font-semibold text-secondary hover:text-secondary/80"
                >
                  Read article →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </article>
    </BlogShell>
  );
}
