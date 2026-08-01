import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Shield, Mail } from "lucide-react";
import BlogShell from "@/components/BlogShell";

const SITE_URL = "https://www.narayaneeyam.app";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Privacy Policy — Sriman Narayaneeyam",
  url: `${SITE_URL}/privacy`,
  description:
    "Learn how the Narayaneeyam app collects, uses, and protects your personal information.",
  publisher: {
    "@type": "Organization",
    name: "Sriman Narayaneeyam",
    url: SITE_URL,
    contactPoint: {
      "@type": "ContactPoint",
      email: "namaste@narayaneeyam.app",
      contactType: "Privacy",
    },
  },
  dateModified: "2026-08-01",
};

export default function PrivacyPage() {
  return (
    <BlogShell subtitle="Privacy & Trust">
      <Helmet>

        <title>Privacy Policy — Sriman Narayaneeyam</title>
        <meta
          name="description"
          content="Privacy Policy for the Sriman Narayaneeyam app: how we collect, use, share, and protect your information."
        />
        <link rel="canonical" href="https://www.narayaneeyam.app/privacy" />
        <meta property="og:title" content="Privacy Policy — Sriman Narayaneeyam" />
        <meta
          property="og:description"
          content="How the Narayaneeyam app collects, uses, and protects your information."
        />
        <meta property="og:url" content="https://www.narayaneeyam.app/privacy" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Privacy Policy — Sriman Narayaneeyam" />
        <meta
          name="twitter:description"
          content="How the Narayaneeyam app collects, uses, and protects your information."
        />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <article className="max-w-3xl mx-auto px-5 py-10 sm:py-14">
        <header className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-gradient-peacock text-primary-foreground mb-4">
            <Shield className="h-6 w-6" />
          </div>
          <span className="text-xs font-sans uppercase tracking-[0.2em] text-secondary">Legal</span>
          <h1 className="font-display text-3xl sm:text-4xl text-primary mt-3 mb-3">Privacy Policy</h1>
          <div className="mx-auto h-[2px] w-20 bg-gradient-gold rounded-full mb-3" />
          <p className="text-sm font-sans text-muted-foreground">Last updated: 1 August 2026</p>
        </header>

        <p className="text-sm font-sans text-muted-foreground mb-8">
          This page is maintained by the Narayaneeyam team to explain how Sriman Narayaneeyam ("we",
          "the app") collects, uses, and protects your information. It is not a third-party certification
          or legal audit. Platform hosting and security services are provided by our backend partners;
          the app owner is responsible for the data practices described here.
        </p>

        <section className="mb-8">
          <h2 className="font-display text-xl text-primary mb-3">1. Introduction</h2>
          <div className="font-sans text-foreground/80 leading-relaxed space-y-3">
            <p>
              Your privacy matters to us. This Privacy Policy explains what information we collect when
              you use the Sriman Narayaneeyam app, how we use it, who we share it with, and the choices
              you have about your data.
            </p>
            <p>
              By using the app, you agree to the practices described in this policy. If you do not agree,
              please do not use the app.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl text-primary mb-3">2. Information We Collect</h2>
          <div className="font-sans text-foreground/80 leading-relaxed space-y-3">
            <p>We collect the following types of information to provide and improve the app:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Account information:</strong> When you sign up, we collect your email address and
                the name you choose to display. This is required to create your account and keep your
                progress safe.
              </li>
              <li>
                <strong>Payment information:</strong> If you subscribe to a paid plan, your payment is
                processed by Razorpay. We do not store your raw card numbers, CVV, or other payment
                instrument details. Razorpay handles payment processing and shares only the payment
                status and subscription details with us.
              </li>
              <li>
                <strong>Usage data:</strong> We record your progress through the Dashakams, chanting
                sessions, minutes chanted, and group participation so we can show your streaks,
                achievements, and personal practice history.
              </li>
              <li>
                <strong>Device and notification data:</strong> If you enable push reminders, we store a
                device token so we can send you gentle reminders about your chanting practice, festivals,
                and subscription renewal. You can disable these at any time in your device settings or in the
                app.
              </li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl text-primary mb-3">3. How We Use Your Information</h2>
          <div className="font-sans text-foreground/80 leading-relaxed space-y-3">
            <p>We use the information we collect for these purposes:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide the app's core features: chanting, podcast playback, progress tracking, and group parayanam.</li>
              <li>To process your subscription payments and manage your trial or billing period.</li>
              <li>To send you reminders, festival alerts, and gentle nudges about your practice (only if you opt in).</li>
              <li>To improve the app, fix issues, and understand how devotees use the features we build.</li>
              <li>To communicate with you about your account, support requests, or important policy updates.</li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl text-primary mb-3">4. Data Sharing</h2>
          <div className="font-sans text-foreground/80 leading-relaxed space-y-3">
            <p>
              We do not sell your personal data. We share information only with trusted service providers
              who help us run the app:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Razorpay:</strong> for payment processing and subscription management.
              </li>
              <li>
                <strong>Supabase (via Lovable Cloud):</strong> for secure database hosting, authentication,
                file storage, and serverless functions. Supabase stores user data on our behalf and is bound
                by its own security and privacy commitments.
              </li>
              <li>
                <strong>Analytics services:</strong> We may use analytics tools to understand app usage in
                aggregate. These tools do not receive personal information beyond what is necessary for
                that purpose.
              </li>
            </ul>
            <p>
              We may also share information if required by law, to protect our rights, or to keep the app
              safe for all users.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl text-primary mb-3">5. Data Retention</h2>
          <div className="font-sans text-foreground/80 leading-relaxed space-y-3">
            <p>
              We keep your account and progress data for as long as your account is active. If you delete
              your account, we will remove or anonymize your personal information within a reasonable time,
              except where we need to retain it for legal, security, or fraud-prevention purposes.
            </p>
            <p>
              You can request account deletion at any time through the "Delete My Account" option in
              <Link to="/preferences" className="text-secondary hover:underline"> My Preferences</Link>.
              Group owners must first transfer ownership of any groups they manage; the app will guide you
              through this step before deletion.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl text-primary mb-3">6. Your Rights</h2>
          <div className="font-sans text-foreground/80 leading-relaxed space-y-3">
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Access the personal data we hold about you.</li>
              <li>Correct inaccurate or incomplete information.</li>
              <li>Delete your account and associated data.</li>
              <li>Withdraw consent for optional features such as push notifications.</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{" "}
              <a
                href="mailto:namaste@narayaneeyam.app"
                className="text-secondary hover:underline inline-flex items-center gap-1"
              >
                <Mail className="h-3.5 w-3.5" />
                namaste@narayaneeyam.app
              </a>.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl text-primary mb-3">7. Children's Privacy</h2>
          <div className="font-sans text-foreground/80 leading-relaxed space-y-3">
            <p>
              Sriman Narayaneeyam is not directed at children under 13. We do not knowingly collect personal
              information from children under 13. If you believe we have collected such information, please
              contact us and we will delete it promptly.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl text-primary mb-3">8. Changes to This Policy</h2>
          <div className="font-sans text-foreground/80 leading-relaxed space-y-3">
            <p>
              We may update this Privacy Policy from time to time. When we do, we will change the "Last
              updated" date at the top of this page. For significant changes, we will also notify you via
              email or through the app.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-xl text-primary mb-3">9. Contact Us</h2>
          <div className="font-sans text-foreground/80 leading-relaxed space-y-3">
            <p>
              If you have any questions, concerns, or requests about this Privacy Policy or how we handle
              your data, please reach out:
            </p>
            <p>
              <a
                href="mailto:namaste@narayaneeyam.app"
                className="text-secondary hover:underline inline-flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                namaste@narayaneeyam.app
              </a>
            </p>
          </div>
        </section>

        <div className="rounded-xl border border-gold/30 bg-cream dark:bg-transparent p-5 sm:p-6 text-center mt-12">
          <p className="font-sans text-sm text-foreground/80">
            We are committed to keeping your devotional practice safe, secure, and private.
          </p>
          <p className="font-sans text-sm text-foreground/70 mt-2">
            Platform hosting and security are provided by our backend partners. Narayaneeyam is
            responsible for the data practices described here.
          </p>
        </div>
      </article>
    </BlogShell>
  );
}
