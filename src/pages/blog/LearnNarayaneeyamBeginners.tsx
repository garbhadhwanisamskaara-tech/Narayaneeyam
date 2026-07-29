import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import BlogShell from "@/components/BlogShell";
import InstagramFollow from "@/components/InstagramFollow";

const TITLE = "How to Learn Narayaneeyam for Beginners";
const DESCRIPTION =
  "Step-by-step guide to learning Narayaneeyam for beginners — pronunciation tips, daily routine, meaning study, and how to use the Narayaneeyam App to start chanting.";
const URL = "https://narayaneeyam.app/blog/how-to-learn-narayaneeyam-for-beginners";

export default function LearnNarayaneeyamBeginners() {
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

        <h1 className="font-display text-3xl sm:text-4xl text-primary mt-4 mb-2 leading-tight">{TITLE}</h1>
        <p className="italic text-foreground/70 mb-4">A Simple Step-by-Step Guide to Start Your Chanting Journey</p>
        <div className="h-[2px] w-20 bg-gradient-gold rounded-full mb-6" />

        <h2 className="font-display text-2xl text-primary mt-8 mb-3 pb-2 border-b border-gold">What is Narayaneeyam?</h2>
        <p className="mb-4">
          Narayaneeyam was composed by Melpathur Narayana Bhattathiri as a poetic summary of the Srimad Bhagavatam — 100 dashakams and over 1000 verses dedicated to Lord Guruvayurappan. It is not just a text to be read, but a spiritual practice meant to be chanted, contemplated and lived.
        </p>

        <h2 className="font-display text-2xl text-primary mt-8 mb-3 pb-2 border-b border-gold">Why Beginners Find Narayaneeyam Difficult</h2>
        <ul className="list-disc pl-6 mb-6 space-y-1">
          <li>Concerns about Sanskrit pronunciation</li>
          <li>Long verses that feel intimidating at first</li>
          <li>Fear of making mistakes</li>
          <li>Lack of structured guidance</li>
          <li>Difficulty finding authentic audio</li>
        </ul>

        <h2 className="font-display text-2xl text-primary mt-8 mb-3 pb-2 border-b border-gold">Step 1 — Start with Listening</h2>
        <p className="mb-3">
          Before you ever attempt to chant, hear the correct chanting repeatedly. The ear trains the tongue.
        </p>
        <ul className="list-disc pl-6 mb-6 space-y-1">
          <li>Listen early morning or evening when the mind is settled.</li>
          <li>Use headphones for clarity.</li>
          <li>Repeat one verse multiple times before moving on.</li>
          <li>Do not rush memorisation — let it form naturally.</li>
        </ul>

        <h2 className="font-display text-2xl text-primary mt-8 mb-3 pb-2 border-b border-gold">Step 2 — Learn Proper Pronunciation</h2>
        <ul className="list-disc pl-6 mb-6 space-y-1">
          <li>Distinguish long and short vowels carefully.</li>
          <li>Practise the clarity of <em>tha</em>, <em>dha</em>, <em>sha</em> and <em>sa</em>.</li>
          <li>Split words at the right joints — sandhi matters.</li>
          <li>Find a comfortable chanting pace; speed is not the goal.</li>
        </ul>

        <h2 className="font-display text-2xl text-primary mt-8 mb-3 pb-2 border-b border-gold">Step 3 — Learn One Dashakam at a Time</h2>
        <p className="mb-4">
          Begin with a single dashakam. Break it into smaller verses, practise 10 to 15 minutes daily, and revise the previous day's verses before adding new ones. Steady accumulation beats occasional bursts.
        </p>

        <h2 className="font-display text-2xl text-primary mt-8 mb-3 pb-2 border-b border-gold">Step 4 — Understand the Meaning</h2>
        <p className="mb-4">
          Narayaneeyam describes the stories of Lord Krishna, the path of bhakti, cosmic philosophy, compassion, divine beauty, surrender and healing. When you know what you are chanting, the verses come alive — devotion deepens naturally.
        </p>

        <h2 className="font-display text-2xl text-primary mt-8 mb-3 pb-2 border-b border-gold">Step 5 — Create a Daily Chanting Routine</h2>
        <p className="mb-3">A simple 20-minute routine is enough to begin:</p>
        <ul className="list-disc pl-6 mb-6 space-y-1">
          <li>5 minutes of listening</li>
          <li>10 minutes of repeat-after-audio</li>
          <li>5 minutes of revising previous verses</li>
        </ul>

        <h2 className="font-display text-2xl text-primary mt-8 mb-3 pb-2 border-b border-gold">Benefits of Learning Narayaneeyam</h2>
        <ul className="list-disc pl-6 mb-6 space-y-1">
          <li>Mental calmness</li>
          <li>Improved concentration</li>
          <li>Emotional grounding</li>
          <li>Spiritual connection</li>
          <li>Better Sanskrit familiarity</li>
          <li>A more positive family atmosphere</li>
        </ul>

        <h2 className="font-display text-2xl text-primary mt-8 mb-3 pb-2 border-b border-gold">Best Way to Learn Narayaneeyam Online</h2>
        <p className="mb-4">
          The Narayaneeyam App offers guided audio, structured dashakam learning, easy repeat listening, full Sanskrit text support and a beginner-friendly experience that respects both tradition and your schedule.
        </p>

        <h2 className="font-display text-2xl text-primary mt-8 mb-3 pb-2 border-b border-gold">Final Thoughts</h2>
        <p className="mb-4">
          You do not need perfect Sanskrit or prior experience. Devotion grows through sincere, consistent practice. Start slowly. Listen daily. Learn patiently. The Lord meets every effort, however small.
        </p>

        <InstagramFollow variant="cta" label="Follow us on Instagram" />

        <div className="text-center mt-12">
          <Link
            to="/learn"
            className="inline-block bg-gradient-gold text-secondary-foreground font-display font-semibold px-8 py-3 rounded-full shadow-gold hover:opacity-90 transition-opacity"
          >
            Start Learning Now
          </Link>
        </div>
      </article>
    </BlogShell>
  );
}
