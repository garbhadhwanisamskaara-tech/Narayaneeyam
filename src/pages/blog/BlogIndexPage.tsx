import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import BlogShell from "@/components/BlogShell";

const posts = [
  {
    slug: "how-chanting-narayaneeyam-gave-me-peace",
    title: "How Chanting Narayaneeyam Gave Me Peace",
    excerpt:
      "Sri Ramesh from Chennai shares how chanting Narayaneeyam daily transformed his mental peace, reduced anxiety and brought divine calm into his life.",
  },
  {
    slug: "how-to-do-100-day-narayaneeyam-parayanam",
    title: "How to Do 100 Day Narayaneeyam Parayanam",
    excerpt:
      "Complete guide to 100 Day Narayaneeyam Parayanam — chant one dasakam daily for 100 days, invoke Lord Guruvayurappan's blessings, and transform your spiritual life.",
  },
  {
    slug: "how-to-learn-narayaneeyam-for-beginners",
    title: "How to Learn Narayaneeyam for Beginners",
    excerpt:
      "Step-by-step guide to learning Narayaneeyam for beginners — pronunciation tips, daily routine, meaning study, and how to use the Narayaneeyam App to start chanting.",
  },
];

export default function BlogIndexPage() {
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
          <p className="mt-5 text-foreground/70 font-sans leading-relaxed">
            Devotional articles, chanting guides and personal stories from devotees of Sriman Narayaneeyam.
          </p>
        </header>

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
      </article>
    </BlogShell>
  );
}
