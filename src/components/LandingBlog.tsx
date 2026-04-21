import { useNavigate } from "react-router-dom";

const blogJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "What is Narayaneeyam? A Complete Beginner's Guide",
  description:
    "Discover what Narayaneeyam is, who wrote it, why it is chanted, and how this 1036-verse Sanskrit masterpiece can transform your life.",
  url: "https://narayaneeyam.app/blog/what-is-narayaneeyam-beginners-guide",
  author: { "@type": "Organization", name: "Narayaneeyam.app" },
  publisher: {
    "@type": "Organization",
    name: "Narayaneeyam.app",
    url: "https://narayaneeyam.app",
  },
};

export { blogJsonLd };

export default function LandingBlog() {
  const navigate = useNavigate();

  return (
    <section className="landing-section" id="blog" style={{ background: "#fff" }}>
      <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 2rem" }}>
        <span className="landing-section-label">From Our Blog</span>
        <h2 className="landing-section-title">Learn About Narayaneeyam</h2>
        <div className="landing-gold-line center-line" />
      </div>

      <article
        style={{
          maxWidth: 820,
          margin: "0 auto",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          color: "#2a2010",
          lineHeight: 1.85,
          fontSize: "1.08rem",
        }}
      >
        <h1
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: "2rem",
            color: "#063d3d",
            textAlign: "center",
            marginBottom: "1.5rem",
            lineHeight: 1.3,
          }}
        >
          What is Narayaneeyam? A Complete Beginner's Guide
        </h1>

        <p>
          If you have heard devotees chanting melodious Sanskrit verses dedicated to Lord Guruvayurappan, you may have encountered Narayaneeyam — one of the most beloved devotional texts in the Hindu tradition. But what exactly is Narayaneeyam, and why do millions of devotees across the world chant it daily?
        </p>
        <p>This complete beginner's guide answers every question you might have.</p>

        <h2 className="landing-blog-h2">What is Narayaneeyam?</h2>
        <p>
          Narayaneeyam is a Sanskrit devotional composition of 1036 verses organized into 100 chapters called Dashakams. It is a condensed poetic retelling of the Srimad Bhagavatam — the great Purana dedicated to Lord Vishnu — written with extraordinary literary beauty and deep devotional intent.
        </p>
        <p>
          The name "Narayaneeyam" means "that which is about Narayana" — Lord Vishnu or Krishna, the supreme being in Vaishnavite tradition.
        </p>

        <h2 className="landing-blog-h2">Who Wrote Narayaneeyam?</h2>
        <p>
          Narayaneeyam was composed by <strong>Melpathur Narayana Bhattathiri</strong>, a brilliant Sanskrit scholar from Kerala, India. He wrote it in the 16th century, at the age of 27, at the Guruvayur temple in present-day Kerala.
        </p>
        <p>
          The story of its composition is remarkable. Bhattathiri's revered guru, Achyuta Pisharadi, was suffering from severe rheumatism. In an extraordinary act of devotion and sacrifice, Bhattathiri prayed to Lord Guruvayurappan to transfer his guru's disease to himself. The prayer was granted — and Bhattathiri became afflicted with the painful condition.
        </p>
        <p>
          Unable to walk, he was carried to the Guruvayur temple and prostrated before the Lord. He then began composing one Dashakam (10 verses) each day as an offering, praying for relief and liberation.
        </p>
        <p>
          On the 100th day, the Lord appeared before him, and Bhattathiri composed the final Dashakam describing the divine vision he witnessed. He was completely cured.
        </p>

        <h2 className="landing-blog-h2">Why is Narayaneeyam So Special?</h2>
        <p>Several qualities make Narayaneeyam uniquely powerful:</p>
        <p>
          <strong>Written in personal anguish</strong> — Because it was composed during intense physical suffering, every verse carries raw, heartfelt devotion. Readers can feel the poet's sincerity in every line.
        </p>
        <p>
          <strong>First-person address</strong> — Unlike many Sanskrit texts written in the third person, Narayaneeyam is written as a direct conversation with the Lord. When you chant it, you are speaking directly to God — which creates a deeply personal devotional experience.
        </p>
        <p>
          <strong>Literary excellence</strong> — Narayaneeyam is considered a masterpiece of Sanskrit poetry. Bhattathiri's command over Sanskrit grammar, meter, and imagery is exceptional.
        </p>
        <p>
          <strong>Condensed wisdom</strong> — It contains the essence of the entire Srimad Bhagavatam — 18,000 verses — compressed into 1036 verses without losing any philosophical or devotional depth.
        </p>
        <p>
          <strong>Proven healing</strong> — Countless devotees report experiencing physical and mental relief after regular chanting. The tradition holds that Narayaneeyam grants Ayur (long life), Arogya (health), and Saukhyam (happiness).
        </p>

        <h2 className="landing-blog-h2">What is a Dashakam?</h2>
        <p>
          Each of the 100 chapters is called a <strong>Dashakam</strong> (from "dasha" meaning ten). Each Dashakam contains approximately 10 verses covering a specific theme, story, or aspect of Lord Vishnu's glory.
        </p>
        <p>For example:</p>
        <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem" }}>
          <li>Dashakam 1 covers the greatness of Guruvayur and the nature of the Lord</li>
          <li>Dashakams 2–10 cover the creation of the universe</li>
          <li>Middle dashakams narrate the divine stories (leelas) of Krishna</li>
          <li>The final Dashakam 100 is the climactic vision of the Lord</li>
        </ul>

        <h2 className="landing-blog-h2">How Long Does it Take to Chant Narayaneeyam?</h2>
        <p>
          A full recitation of all 1036 verses takes approximately <strong>5 hours</strong>. Many devotees chant the complete text in one sitting as a special offering called "Narayaneeyam Parayanam."
        </p>
        <p>
          For daily practice, most devotees chant one or a few Dashakams per day, completing the full text over 100 days — mirroring Bhattathiri's original composition.
        </p>

        <h2 className="landing-blog-h2">Who Should Learn Narayaneeyam?</h2>
        <p>
          Narayaneeyam is for everyone — regardless of age, background, or level of Sanskrit knowledge. It is especially beneficial for:
        </p>
        <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem" }}>
          <li>Devotees of Lord Krishna or Lord Vishnu seeking a structured daily chanting practice</li>
          <li>Those seeking relief from illness, stress, or difficulties</li>
          <li>Sanskrit students wanting to study beautiful classical poetry</li>
          <li>Anyone wanting to understand the stories of the Bhagavatam in a compact form</li>
          <li>Families wanting to introduce children to devotional Sanskrit texts</li>
        </ul>

        <h2 className="landing-blog-h2">Where is Narayaneeyam Chanted?</h2>
        <p>
          Narayaneeyam holds special significance at the <strong>Guruvayur Sri Krishna Temple</strong> in Kerala, where it was originally composed. Daily recitations are conducted at the temple, and the text is considered inseparable from Guruvayurappan's worship.
        </p>
        <p>
          Beyond Kerala, Narayaneeyam chanting groups exist across India, the United States, the United Kingdom, Canada, Singapore, and wherever the Indian diaspora has settled.
        </p>

        <h2 className="landing-blog-h2">How to Get Started with Narayaneeyam</h2>
        <p>Starting your Narayaneeyam journey is simpler than you might think:</p>
        <ol style={{ paddingLeft: "1.5rem", marginBottom: "1rem" }}>
          <li><strong>Begin with the Dhyana Slokas</strong> — the opening invocatory verses</li>
          <li><strong>Learn Dashakam 1</strong> — just 10 verses that introduce the Lord's form</li>
          <li><strong>Chant daily</strong> — even 5 minutes a day builds familiarity rapidly</li>
          <li><strong>Read the meaning</strong> — understanding what you chant deepens the experience</li>
          <li><strong>Use a structured learning platform</strong> — narayaneeyam.app offers verse-by-verse learning with transliteration and meaning</li>
        </ol>

        <h2 className="landing-blog-h2">Conclusion</h2>
        <p>
          Narayaneeyam is not merely a religious text — it is a living conversation between a devotee and God, a literary treasure, and a practical guide to devotion. Whether you are drawn to it for spiritual growth, healing, or the beauty of Sanskrit poetry, Narayaneeyam has something profound to offer.
        </p>
        <p>
          Begin with one verse. One Dashakam. The journey of a hundred Dashakams starts with a single word.
        </p>

        <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
          <button
            className="landing-btn-primary"
            onClick={() => navigate("/auth")}
            style={{ fontSize: "1rem" }}
          >
            Start Learning Narayaneeyam →
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <a
            href="#blog"
            style={{
              color: "#1a7a7a",
              fontFamily: "'Cinzel', serif",
              fontSize: "0.95rem",
              textDecoration: "underline",
            }}
          >
            Read More Blogs →
          </a>
        </div>
      </article>

      <style>{`
        .landing-blog-h2 {
          font-family: 'Cinzel', serif;
          font-size: 1.4rem;
          color: #063d3d;
          margin-top: 2rem;
          margin-bottom: 0.8rem;
          padding-bottom: 0.4rem;
          border-bottom: 1px solid rgba(201,168,76,0.3);
        }
      `}</style>
    </section>
  );
}
