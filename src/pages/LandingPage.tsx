import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { faqSections } from "@/data/faqData";
import { supabase } from "@/integrations/supabase/client";
import "./LandingPage.css";

const LOGO_URL = "https://znglsaxfyhkuzyrfbuhn.supabase.co/storage/v1/object/public/images/SNlogo.png";

const features = [
  { icon: "🎵", name: "Chant With Me", desc: "Follow along with synchronized text highlighting as an expert recites each sloka. Never lose your place in the chant again." },
  { icon: "📜", name: "Script Library", desc: "Read slokas in Malayalam, Sanskrit Devanagari, IAST transliteration, and Tamil scripts — choose what feels natural to you." },
  { icon: "🎙️", name: "Sacred Podcast", desc: "Listen to dashakams in the background while going about your day. Let the divine vibrations fill your space." },
  { icon: "🔖", name: "Bookmarks", desc: "Save your favourite verses for quick access. Build a personal collection of slokas that resonate most with your heart." },
  { icon: "❤️", name: "Favourites", desc: "Mark slokas close to your heart. Perfect for slokas you chant daily for specific blessings — health, peace, or gratitude." },
  { icon: "📊", name: "Practice Tracker", desc: "Track your streak days, minutes chanted, and sessions completed. Build a meaningful, consistent devotional practice." },
  { icon: "🌐", name: "Group Chanting", desc: "Join virtual group chanting sessions with devotees around the world. Experience the power of collective prayer." },
  { icon: "📖", name: "Meanings & Context", desc: "Deep-dive into word-by-word meanings, contextual explanations, and the stories behind each dashakam." },
];

const stories = [
  { icon: "💍", tag: "Marriage & Partnership", name: "Finding a Soulmate", quote: "After years of searching, my mother began the Narayaneeyam parayanam of certain dashakams with pure intent. Within six months, I met my husband at a Guruvayur pilgrimage. We are now happily married for three years.", initials: "DP", person: "Deepa Kailash", loc: "Chennai, TN", color: "#1a7a7a", featured: true },
  { icon: "👶", tag: "Blessing of Children", name: "The Gift of Parenthood", quote: "We had been longing for a child for seven years. A dear aunt suggested we chant Krishnaavataaraha from Narayaneeyam for 41 days. Our son was born exactly one year later. His name is Narayanan.", initials: "SR", person: "Suresh & Rekha Nair", loc: "Trissur, Kerala", color: "#0d5c5c" },
  { icon: "🌿", tag: "Health & Healing", name: "Recovery Against All Odds", quote: "My father was diagnosed with a serious illness. The doctors gave little hope. Our family began a group Narayaneeyam chanting every morning. He recovered fully and is now 78, vibrant and healthy.", initials: "KM", person: "Kavitha Menon", loc: "Chennai, Tamil Nadu", color: "#c9a84c", textColor: "#063d3d" },
  { icon: "🕊️", tag: "Inner Peace", name: "Stillness in the Storm", quote: "I was going through a painful divorce and career collapse at the same time. Narayaneeyam became my anchor. That is when I learnt to chant and I am so grateful to my Guru. It gave me a peace I cannot describe in words.", initials: "RK", person: "Ramesh Kumar", loc: "Bengaluru, Karnataka", color: "#063d3d" },
  { icon: "🌸", tag: "Grief & Loss", name: "Solace in Bereavement", quote: "When my mother passed away unexpectedly, I was inconsolable. A friend gently introduced me Narayaneeyam. It helped me accept that she is in His care. Narayaneeyam has become my life anchor.", initials: "PA", person: "Priya Anand", loc: "Coimbatore, Tamil Nadu", color: "#1a7a7a" },
  { icon: "🫶", tag: "Community & Connection", name: "The Power of Group Chanting", quote: "Our WhatsApp group of 12 friends started an online Narayaneeyam parayanam during the pandemic lockdown. Three years on, we still meet every Sunday. It has become the most meaningful hour of our week.", initials: "VG", person: "Vijayalakshmi Gopalan", loc: "Singapore", color: "#0d5c5c" },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [festivalMessage, setFestivalMessage] = useState<string | null>(null);

  // Fetch festival messages: show custom_message from 3 days before to festival_date (IST)
  useEffect(() => {
    async function fetchFestival() {
      try {
        // Get current date in IST
        const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const todayIST = nowIST.toISOString().split("T")[0];
        
        // 3 days from now in IST
        const threeDaysAgo = new Date(nowIST);
        threeDaysAgo.setDate(threeDaysAgo.getDate() + 3);
        const maxDate = threeDaysAgo.toISOString().split("T")[0];

        const { data } = await (supabase as any)
          .from("festival_dashakams")
          .select("festival_date, custom_message")
          .eq("is_active", true)
          .gte("festival_date", todayIST)
          .lte("festival_date", maxDate)
          .order("festival_date", { ascending: true })
          .limit(1);

        if (data && data.length > 0 && data[0].custom_message) {
          setFestivalMessage(data[0].custom_message);
        }
      } catch {
        // silent
      }
    }
    fetchFestival();
  }, []);

  useEffect(() => {
    document.title = "Sriman Narayaneeyam — Your Gateway to Divine Grace";
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).style.opacity = "1";
            (e.target as HTMLElement).style.transform = "translateY(0)";
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".landing-animate-in").forEach((el) => {
      (el as HTMLElement).style.opacity = "0";
      (el as HTMLElement).style.transform = "translateY(24px)";
      (el as HTMLElement).style.transition = "opacity 0.5s ease, transform 0.5s ease";
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  const goAuth = () => navigate("/auth");

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="landing-page">
      {/* NAV */}
      <nav className="landing-nav">
        <a href="#" className="landing-nav-logo" onClick={(e) => { e.preventDefault(); scrollTo("hero"); }}>
          <img src={LOGO_URL} alt="Sriman Narayaneeyam" className="landing-logo-img" style={{ background: "transparent" }} />
        </a>
        <div className="landing-nav-links">
          <button onClick={() => scrollTo("what")}>About</button>
          <button onClick={() => scrollTo("features")}>Features</button>
          <button onClick={() => scrollTo("sloka")}>Sample Sloka</button>
          <button onClick={() => scrollTo("benefits")}>Stories</button>
          <button onClick={() => scrollTo("faq")}>FAQ</button>
          <button className="landing-nav-cta" onClick={goAuth}>Begin Journey</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="landing-hero" id="hero">
        <div className="landing-hero-om">ॐ</div>
        <span className="landing-hero-subtitle-top">A Sacred Digital Sanctuary</span>
        <h1 className="landing-hero-title">Sriman <span className="golden">Narayaneeyam</span></h1>
        <p className="landing-hero-tagline">Your Gateway to Divine Grace</p>
        <p className="landing-hero-desc">
          A sacred journey through 100 Dashakams — chant, learn, and grow in devotion
          with the divine grace of Guruvayurappan. Composed by Melpathur Narayana Bhattathiri
          in the 16th century, now brought to your fingertips.
        </p>
        <div className="landing-hero-btns">
          <button className="landing-btn-primary" onClick={goAuth}>Begin Your Journey</button>
          <button className="landing-btn-outline" onClick={() => scrollTo("sloka")}>▶ Listen to a Sloka for Health benefits</button>
        </div>
        <div className="landing-scroll-hint">
          <span>Explore</span>
          <div className="landing-scroll-arrow" />
        </div>
        <div className="landing-hero-divider" />
      </section>

      {/* WHAT IS NARAYANEEYAM */}
      <section className="landing-section" id="what" style={{ background: "#faf6ef" }}>
        <div className="landing-what-grid">
          <div className="landing-what-visual">
            <div className="landing-what-circle landing-animate-in">
              <div className="landing-what-circle-num">100</div>
              <div className="landing-what-circle-label">Dashakams</div>
              <div className="landing-what-circle-divider" />
              <div className="landing-what-circle-num" style={{ fontSize: "2.5rem" }}>1036</div>
              <div className="landing-what-circle-label">Divine Slokas</div>
              <div className="landing-what-circle-divider" />
              <div className="landing-what-circle-sub">Composed in 1586 CE<br />at Guruvayur Temple</div>
            </div>
          </div>
          <div className="landing-what-content">
            <span className="landing-section-label">The Sacred Text</span>
            <h2 className="landing-section-title">What is Narayaneeyam?</h2>
            <div className="landing-gold-line" />
            <p>
              Narayaneeyam is a devotional Sanskrit work composed by the great poet-saint
              Melpathur Narayana Bhattathiri in the 16th century at the sacred Guruvayur temple in Kerala.
              Bhattathiri composed this masterpiece to seek the blessings of Lord Guruvayurappan
              (Lord Krishna) to cure himself of a debilitating illness.
            </p>
            <div className="landing-sanskrit">
              आयुरारोग्यसौख्यं देहि देव नमोऽस्तु ते ।<br />
              <span className="landing-sanskrit-trans">"Grant me longevity, health and happiness, O Lord — I bow to Thee."</span>
            </div>
            <p>
              Spanning 100 Dashakams (groups of 10 verses each), it beautifully narrates the
              stories of the Lord from the Bhagavata Purana, culminating in a vision of the divine form
              — and Bhattathiri's miraculous healing. It remains one of the most powerful devotional texts
              in the Hindu tradition, chanted daily by thousands of devotees worldwide.
            </p>
            <div className="landing-stats-row">
              {[
                { num: "1586", lbl: "Year Composed" },
                { num: "100", lbl: "Dashakams" },
                { num: "1036", lbl: "Slokas" },
                { num: "438+", lbl: "Years of Devotion" },
              ].map((s) => (
                <div key={s.lbl} className="landing-stat-item">
                  <span className="landing-stat-num">{s.num}</span>
                  <span className="landing-stat-lbl">{s.lbl}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="landing-features-section" id="features">
        <div style={{ textAlign: "center", maxWidth: 700, margin: "0 auto 3rem" }}>
          <span className="landing-section-label">The App</span>
          <h2 className="landing-section-title">Everything You Need on Your Sacred Path</h2>
          <p className="landing-features-intro">
            The Narayaneeyam app brings the full richness of this ancient text into a modern,
            beautifully crafted digital experience — for devotees at every stage of their journey.
          </p>
        </div>
        <div className="landing-features-grid">
          {features.map((f) => (
            <div key={f.name} className="landing-feature-card landing-animate-in">
              <span className="landing-feature-icon">{f.icon}</span>
              <div className="landing-feature-name">{f.name}</div>
              <p className="landing-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SLOKA PLAYER */}
      <section className="landing-sloka-section" id="sloka">
        <div className="landing-sloka-wrapper">
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <span className="landing-section-label" style={{ color: "#0d5c5c" }}>No Sign-up Required</span>
            <h2 className="landing-section-title" style={{ color: "#063d3d" }}>Experience a Sloka for Health &amp; Healing</h2>
            <div className="landing-gold-line center-line" />
            <p style={{ color: "#7a6845", fontSize: "1.05rem", lineHeight: 1.8, maxWidth: 560, margin: "0 auto" }}>
              Listen to this powerful sloka from Dashakam 90, traditionally chanted for health,
              healing, and physical wellbeing. No account needed.
            </p>
          </div>
          <div className="landing-sloka-card landing-animate-in">
            <div className="landing-sloka-badge">✦ Dashakam 8 — Arogya Slokam ✦</div>
            <div className="landing-sloka-dashakam">Sloka for Health &amp; Healing</div>
            <div className="landing-sloka-name">Arogya Slokam</div>
            <div className="landing-sloka-text">
              अस्मिन् परात्मन् ननु पाद्मकल्पे<br />
              त्वमित्थमुत्थापितपद्मयोनि: ।<br />
              अनन्तभूमा मम रोगराशिं<br />
              निरुन्धि वातालयवास विष्णो ॥<br /><br />
              Asmin parathman nanu paathmakalpe<br />
              Thvamithamutthapitha padmayonihi ।<br />
              Anantha bhooma mama roga raashim,<br />
              Nirundhi vaathalaya vaasa vishno ॥<br /><br />
              அஸ்மின் பராத்மன் நனு பாத்மகல்பே<br />
              த்வமிதமுத்தபித பத்மயோனிஹி ।<br />
              அனந்த பூம மம ரோக ராஷிம்<br />
              நிருந்தி வாதலய வாச விஷ்ணோ ॥
            </div>
            <p className="landing-sloka-meaning">
              "The slokam is a prayer to the Lord Guruvayuppan. Roughly translated it means:
              Oh Lord Vishnu, enshrined in Guruvayur ! Oh Great Soul !
              Oh The Lord of Eternal Glory, who thus awakened Brahma in Paadmakalpa !
              May Thou remove all my afflictions."
            </p>
            <p className="landing-sloka-chapter">Dashakam 8, Sloka 13 · Narayaneeyam by Melpathur Narayana Bhattathiri</p>
            <p style={{ textAlign: "center", fontSize: "0.85rem", color: "#7a6845", fontStyle: "italic", marginTop: "1rem" }}>
              🔓 Audio player coming soon.{" "}
              <button onClick={goAuth} style={{ color: "#1a7a7a", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", font: "inherit" }}>
                Sign up
              </button>{" "}
              to access all 1036 slokas.
            </p>
          </div>
        </div>
      </section>

      {/* BENEFITS / STORIES */}
      <section className="landing-benefits-section" id="benefits">
        <div style={{ textAlign: "center", maxWidth: 700, margin: "0 auto 1rem" }}>
          <span className="landing-section-label">Devotee Stories</span>
          <h2 className="landing-section-title" style={{ textAlign: "center" }}>How Narayaneeyam Has Transformed Lives</h2>
          <div className="landing-gold-line center-line" />
          <p style={{ color: "#7a6845", fontSize: "1.05rem", lineHeight: 1.8 }}>
            For centuries, devout chanting of Narayaneeyam has been associated with miraculous
            blessings. Here are just a few of the many lives it has touched.
          </p>
        </div>
        <div className="landing-benefits-grid">
          {stories.map((s) => (
            <div key={s.initials} className={`landing-benefit-card landing-animate-in ${s.featured ? "featured" : ""}`}>
              <div className="landing-benefit-icon-wrap">{s.icon}</div>
              <span className="landing-benefit-tag">{s.tag}</span>
              <div className="landing-benefit-name">{s.name}</div>
              <p className="landing-benefit-quote">"{s.quote}"</p>
              <div className="landing-benefit-person">
                <div className="landing-avatar" style={{ background: s.color, color: s.textColor || "#fff" }}>{s.initials}</div>
                <div>
                  <div className="landing-person-name">{s.person}</div>
                  <div className="landing-person-loc">{s.loc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AUTH CTA */}
      <section className="landing-auth-section" id="auth">
        <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 3rem", position: "relative" }}>
          <span className="landing-section-label">Begin Today</span>
          <h2 className="landing-section-title" style={{ color: "#fff" }}>Start Your Sacred Journey</h2>
          <div className="landing-gold-line center-line" style={{ marginBottom: 0 }} />
        </div>
        <div className="landing-auth-container">
          <div className="landing-auth-pitch">
            <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: "1.3rem", color: "#e8c96a", marginBottom: "1rem", fontWeight: 500 }}>
              Access to the complete Narayaneeyam
            </h3>
            <p>
              Join thousands of devotees across the world who have made Narayaneeyam
              a daily practice. Your account gives you full access to everything.
            </p>
            <ul className="landing-auth-benefits">
              <li>All 1036 slokas with synchronized audio chanting</li>
              <li>Malayalam, Sanskrit, Tamil &amp; transliteration scripts</li>
              <li>Verse-by-verse meanings and commentaries</li>
              <li>Personal bookmarks and favourites</li>
              <li>Practice streaks and progress tracking</li>
              <li>Group chanting sessions</li>
              <li>Podcast — listen while on the go</li>
              <li>Works on web, iOS, and Android</li>
            </ul>
          </div>
          <div className="landing-auth-form-card">
            <button className="landing-form-submit" onClick={goAuth}>Create Account ✦</button>
            <div style={{ height: "1rem" }} />
            <button className="landing-form-submit" onClick={goAuth}>Sign In ✦</button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="landing-faq-section" id="faq">
        <div style={{ textAlign: "center", maxWidth: 700, margin: "0 auto 2rem" }}>
          <span className="landing-section-label">Common Questions</span>
          <h2 className="landing-section-title">Frequently Asked Questions</h2>
          <div className="landing-gold-line center-line" />
        </div>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          {faqSections.map((section) => (
            <div key={section.heading} style={{ marginBottom: "2rem" }}>
              <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: "1.1rem", fontWeight: 600, color: "#063d3d", marginBottom: "0.8rem", borderBottom: "1px solid rgba(201,168,76,0.3)", paddingBottom: "0.5rem" }}>
                {section.heading}
              </h3>
              <Accordion type="multiple" className="space-y-1">
                {section.questions.map((faq, idx) => (
                  <AccordionItem
                    key={idx}
                    value={`${section.heading}-${idx}`}
                    className="border rounded-lg px-4"
                    style={{ borderColor: "rgba(201,168,76,0.2)", background: "#fff" }}
                  >
                    <AccordionTrigger className="text-left text-sm font-medium hover:no-underline" style={{ color: "#1a1208", fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1rem" }}>
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed" style={{ color: "#4a3b20", fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="landing-footer-logo">
          <img src={LOGO_URL} alt="Sriman Narayaneeyam" className="landing-footer-logo-img" style={{ background: "transparent" }} />
          Sriman Narayaneeyam
        </div>
        <p className="landing-footer-tagline">Chant · Learn · Grow · Experience Divine Grace</p>
        <div className="landing-footer-links">
          <button onClick={() => scrollTo("hero")}>Home</button>
          <button onClick={() => scrollTo("what")}>About Narayaneeyam</button>
          <button onClick={() => scrollTo("faq")}>FAQ</button>
          <button onClick={() => scrollTo("benefits")}>Stories</button>
          <button onClick={goAuth}>Sign In</button>
        </div>
        <p className="landing-footer-copy">
          © 2026 Narayaneeyam App · narayaneeyam.app · Made with devotion for devotees everywhere
        </p>
      </footer>
    </div>
  );
}
