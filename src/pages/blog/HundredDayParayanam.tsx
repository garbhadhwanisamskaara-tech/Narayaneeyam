import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import BlogShell from "@/components/BlogShell";
import InstagramFollow from "@/components/InstagramFollow";

const TITLE = "How to Do 100 Day Narayaneeyam Parayanam";
const DESCRIPTION =
  "Complete guide to 100 Day Narayaneeyam Parayanam — chant one dasakam daily for 100 days, invoke Lord Guruvayurappan's blessings, and transform your spiritual life.";
const URL = "https://narayaneeyam.app/blog/how-to-do-100-day-narayaneeyam-parayanam";

export default function HundredDayParayanam() {
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
          The 100 Day Narayaneeyam Parayanam is a transformative spiritual practice in which devotees chant one dasakam daily from the 100 dasakams of Narayaneeyam, mirroring the original 100 days of composition by Melpathur Narayana Bhattathiri at Guruvayur.
        </p>

        <h2 className="font-display text-2xl text-primary mt-10 mb-3 pb-2 border-b border-gold">Benefits of 100 Day Parayanam</h2>
        <p className="mb-3">
          Devotees who complete the 100-day cycle commonly report relief from chronic illnesses, mental peace, family harmony, prosperity and spiritual elevation. Specific dasakams are traditionally associated with specific benefits:
        </p>
        <ul className="list-disc pl-6 mb-6 space-y-1">
          <li><strong>Dasakam 13</strong> — wealth and abundance</li>
          <li><strong>Dasakam 18</strong> — victory and confidence</li>
          <li><strong>Dasakam 19</strong> — detachment and inner stillness</li>
        </ul>

        <h2 className="font-display text-2xl text-primary mt-10 mb-3 pb-2 border-b border-gold">Preparation Steps</h2>
        <ul className="list-disc pl-6 mb-6 space-y-1">
          <li>Purify yourself with a bath before chanting.</li>
          <li>Face east or north while seated.</li>
          <li>Offer aval (beaten rice), jaggery and flowers to Lord Ganesha first.</li>
          <li>Invoke Guruvayurappan and take a clear sankalpa to chant for 100 consecutive days.</li>
        </ul>

        <h2 className="font-display text-2xl text-primary mt-10 mb-3 pb-2 border-b border-gold">Daily Chanting Schedule</h2>
        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="px-3 py-2 text-left font-semibold">Day Range</th>
                <th className="px-3 py-2 text-left font-semibold">Key Dasakams</th>
                <th className="px-3 py-2 text-left font-semibold">Focus Benefits</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-card">
                <td className="px-3 py-2 border-b border-border">Days 1–30</td>
                <td className="px-3 py-2 border-b border-border">Dasakams 1–30</td>
                <td className="px-3 py-2 border-b border-border">Builds devotion, fulfils wishes, removes sins</td>
              </tr>
              <tr className="bg-muted/30">
                <td className="px-3 py-2 border-b border-border">Days 31–60</td>
                <td className="px-3 py-2 border-b border-border">Dasakams 31–60</td>
                <td className="px-3 py-2 border-b border-border">Increases bhakti, quick marriage, victory</td>
              </tr>
              <tr className="bg-card">
                <td className="px-3 py-2">Days 61–100</td>
                <td className="px-3 py-2">Dasakams 61–100</td>
                <td className="px-3 py-2">Long life, health, salvation on the final day</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="font-display text-2xl text-primary mt-10 mb-3 pb-2 border-b border-gold">Tips for Success</h2>
        <ul className="list-disc pl-6 mb-6 space-y-1">
          <li>Use the guided chants on narayaneeyam.app for accurate rhythm and pronunciation.</li>
          <li>Read the meaning aloud after chanting for deeper devotional impact.</li>
          <li>Avoid breaks in the 100-day cycle — continuity is part of the practice.</li>
          <li>Combine the parayanam with Ekadashi fasts for additional grace.</li>
        </ul>

        <InstagramFollow variant="cta" label="Follow us on Instagram" />

        <div className="text-center mt-12">
          <Link
            to="/chant"
            className="inline-block bg-gradient-gold text-secondary-foreground font-display font-semibold px-8 py-3 rounded-full shadow-gold hover:opacity-90 transition-opacity"
          >
            Begin Your 100 Day Parayanam
          </Link>
        </div>
      </article>
    </BlogShell>
  );
}
