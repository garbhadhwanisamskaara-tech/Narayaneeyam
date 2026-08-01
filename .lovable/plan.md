Privacy Policy Page

Goal
Add a public, SEO-friendly Privacy Policy page at /privacy for the Narayaneeyam app, link it from the public landing page footer and the logged-in account menu, and register it with the site map.

What will be built
1. New page: src/pages/PrivacyPage.tsx
   - Static React component rendered as plain HTML/JSX (no dynamic fetching) for immediate crawler readability.
   - Wrapped in BlogShell so it uses the public teal/gold header/footer and is accessible without login.
   - SEO metadata via react-helmet-async: title, description, canonical /privacy, and a WebPage JSON-LD block.
   - Sections exactly as requested:
     - Title: "Privacy Policy"
     - Last updated: 1 August 2026
     - Introduction
     - Information We Collect (account, payment via Razorpay, usage/progress data, device/notification data)
     - How We Use Information
     - Data Sharing (no sale of personal data; Razorpay, Supabase/Lovable Cloud backend, analytics only if in use)
     - Data Retention
     - User Rights (access, correction, deletion via existing Delete Account)
     - Children's Privacy
     - Changes to This Policy
     - Contact: namaste@narayaneeyam.app
   - Includes an app-owned editable-content qualifier and shared-responsibility language around Supabase backend hosting, consistent with the project's trust-page guidance.

2. Route registration: src/App.tsx
   - Add a top-level public route `<Route path="/privacy" element={<PrivacyPage />} />` alongside /blog, outside the Layout wrapper so it works without authentication.

3. Landing page footer link: src/pages/LandingPage.tsx
   - Add a "Privacy Policy" link in the footer link row, pointing to /privacy.

4. Account menu link: src/components/Layout.tsx
   - Add a "Privacy Policy" item in the desktop dropdown menu (after Help & Support, before Sign Out).
   - Add the same "Privacy Policy" link in the mobile account menu drawer.

5. Sitemap update: public/sitemap.xml
   - Add `<url><loc>https://www.narayaneeyam.app/privacy</loc></url>` to the public page list.

What already exists to reuse
- BlogShell (public page wrapper with peacock header/footer)
- react-helmet-async already installed and wrapped in App.tsx
- Existing TanStack Query / Supabase setup, but not needed for this static page
- Existing Footer on LandingPage and account dropdown in Layout for link placement
- Existing /blog route pattern as a top-level public route
- public/sitemap.xml already lists public pages

Design approach
- Use the same typography as other pages: `font-display` for headings, `font-sans` for body.
- Use the existing theme tokens: `text-primary` (teal), `text-secondary` (gold), `bg-background`, `prose` or custom spacing for readability.
- Keep the page clean, single-column, max-width ~3xl, generous padding and clear section headings.
- Hardcode all copy in JSX; no Markdown or dangerouslySetInnerHTML.

No conflicts or risky changes
- /privacy does not clash with any existing route.
- The page is static and read-only, so it has no RLS or auth implications.
- No environment variables or backend changes are needed.

Verification
- Confirm the route is reachable at /privacy from an unauthenticated session.
- Confirm the footer link on LandingPage and the menu item in Layout navigate to /privacy.
- Confirm sitemap.xml contains the new URL and the page has a canonical tag.
- Run a quick build/typecheck to ensure no import or JSX errors.
