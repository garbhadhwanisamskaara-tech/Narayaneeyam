import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import BlogShell from "@/components/BlogShell";
import InstagramFollow from "@/components/InstagramFollow";
import { supabase } from "@/integrations/supabase/client";

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  meta_description: string | null;
  published_at: string | null;
}

async function fetchPost(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug, title, excerpt, body, meta_description, published_at")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw error;
  return (data as BlogPost) ?? null;
}

export default function BlogPostPage() {
  const { slug = "" } = useParams();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: () => fetchPost(slug),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <BlogShell>
        <div className="max-w-[800px] mx-auto px-5 py-16 animate-pulse">
          <div className="h-8 w-2/3 rounded bg-muted mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-4 w-full rounded bg-muted" />
            ))}
          </div>
        </div>
      </BlogShell>
    );
  }

  if (!post) {
    return (
      <BlogShell>
        <Helmet>
          <title>Article not found | Narayaneeyam App</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="max-w-[800px] mx-auto px-5 py-20 text-center font-sans">
          <h1 className="font-display text-3xl text-primary mb-3">Article not found</h1>
          <p className="text-foreground/70 mb-6">
            This article may have been moved or is no longer published.
          </p>
          <Link to="/blog" className="text-secondary hover:text-secondary/80 font-semibold">
            ← Back to all articles
          </Link>
        </div>
      </BlogShell>
    );
  }

  const url = `https://narayaneeyam.app/blog/${post.slug}`;
  const description = post.meta_description || post.excerpt || "";
  const cleanBody = DOMPurify.sanitize(post.body || "");

  return (
    <BlogShell>
      <Helmet>
        <title>{post.title} | Narayaneeyam App</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />
        <link rel="canonical" href={url} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description,
          url,
          publisher: { "@type": "Organization", name: "Narayaneeyam App", url: "https://narayaneeyam.app" },
          datePublished: post.published_at || undefined,
        })}</script>
      </Helmet>

      <article className="max-w-[800px] mx-auto px-5 py-10 font-sans text-foreground/85 leading-[1.85]">
        <Link to="/blog" className="text-sm text-secondary hover:text-secondary/80 font-sans">← All articles</Link>

        <h1 className="font-display text-3xl sm:text-4xl text-primary mt-4 mb-4 leading-tight">{post.title}</h1>
        <div className="h-[2px] w-20 bg-gradient-gold rounded-full mb-6" />

        <div
          className="blog-body"
          dangerouslySetInnerHTML={{ __html: cleanBody }}
        />

        <InstagramFollow variant="cta" label="Follow us on Instagram" />

        <div className="text-center mt-12">
          <Link
            to="/chant"
            className="inline-block bg-gradient-gold text-secondary-foreground font-display font-semibold px-8 py-3 rounded-full shadow-gold hover:opacity-90 transition-opacity"
          >
            Start Your Chanting Journey
          </Link>
        </div>
      </article>

      <style>{`
        .blog-body h1 { font-size: 1.875rem; }
        .blog-body h1, .blog-body h2, .blog-body h3 {
          font-family: var(--font-display, inherit);
          color: hsl(var(--primary));
          margin-top: 2.5rem;
          margin-bottom: 0.75rem;
          line-height: 1.3;
        }
        .blog-body h2 {
          font-size: 1.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid hsl(var(--gold, var(--secondary)));
        }
        .blog-body h3 { font-size: 1.2rem; }
        .blog-body p { margin-bottom: 1rem; }
        .blog-body ul, .blog-body ol {
          padding-left: 1.5rem;
          margin-bottom: 1.5rem;
          list-style: disc;
        }
        .blog-body ol { list-style: decimal; }
        .blog-body li { margin-bottom: 0.25rem; }
        .blog-body a { color: hsl(var(--secondary)); text-decoration: underline; }
        .blog-body blockquote {
          border-left: 3px solid hsl(var(--secondary));
          padding-left: 1rem;
          font-style: italic;
          margin-bottom: 1.5rem;
        }
      `}</style>
    </BlogShell>
  );
}
