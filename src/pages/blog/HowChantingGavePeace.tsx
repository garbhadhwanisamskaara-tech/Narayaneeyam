import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import BlogShell from "@/components/BlogShell";
import InstagramFollow from "@/components/InstagramFollow";

const TITLE = "How Chanting Narayaneeyam Gave Me Peace";
const DESCRIPTION =
  "Sri Ramesh from Chennai shares how chanting Narayaneeyam daily transformed his mental peace, reduced anxiety and brought divine calm into his life.";
const URL = "https://narayaneeyam.app/blog/how-chanting-narayaneeyam-gave-me-peace";

export default function HowChantingGavePeace() {
  return (
    <BlogShell>
      <Helmet>
        <title>{TITLE} | Narayaneeyam App</title>
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={URL} />
        <meta property="og:type" content="article" />
        <link rel="canonical" href={URL} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          url: URL,
          publisher: { "@type": "Organization", name: "Narayaneeyam App", url: "https://narayaneeyam.app" },
          datePublished: "2025-01-01",
        })}</script>
      </Helmet>

      <article className="max-w-[800px] mx-auto px-5 py-10 font-sans text-foreground/85 leading-[1.85]">
        <Link to="/blog" className="text-sm text-secondary hover:text-secondary/80 font-sans">← All articles</Link>

        <h1 className="font-display text-3xl sm:text-4xl text-primary mt-4 mb-4 leading-tight">{TITLE}</h1>
        <div className="h-[2px] w-20 bg-gradient-gold rounded-full mb-6" />

        <p className="mb-6 text-base">
          Sri Ramesh N A from Chennai discovered profound peace through chanting Narayaneeyam, the sacred hymn dedicated to Lord Guruvayurappan.
        </p>

        <h2 className="font-display text-2xl text-primary mt-10 mb-3 pb-2 border-b border-gold">Sri Ramesh's Discovery</h2>
        <p className="mb-4">
          Living in busy Chennai, Sri Ramesh faced anxiety and health challenges that gradually wore him down. On the suggestion of an elder in his family, he began chanting one dasakam each morning at sunrise. Within days a deep calm enveloped him, quieting his restless mind. The verses, even before their meaning fully revealed itself, carried a settling rhythm that felt like a daily anchor.
        </p>

        <h2 className="font-display text-2xl text-primary mt-10 mb-3 pb-2 border-b border-gold">Deepening Peace</h2>
        <p className="mb-4">
          Over weeks, negativity dissolved, stress dropped, and mental resilience grew. Chanting on Ekadashi days brought heightened grace — a clarity that lingered into ordinary work. The practice fostered gratitude, turning ordinary moments — a cup of coffee, a conversation with his daughter — into joyful devotion. Friends began to notice the change in his bearing before he did.
        </p>

        <h2 className="font-display text-2xl text-primary mt-10 mb-3 pb-2 border-b border-gold">Daily Practice Tips</h2>
        <p className="mb-4">
          He started with English transliterations and the audio on narayaneeyam.app, listening before attempting to chant aloud. He studied the meaning of each sloka so the words could carry their full weight. He visualised the Lord's form during chants — especially Dasakams 14 to 20, which he found particularly soothing for peace and healing.
        </p>
        <ul className="list-disc pl-6 mb-6 space-y-1">
          <li>Begin with audio — listen before you chant.</li>
          <li>Read the meaning so the verses speak to you.</li>
          <li>Keep a fixed time — early morning works best.</li>
          <li>Visualise the Lord's form as you chant.</li>
        </ul>

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
    </BlogShell>
  );
}
