## Goal
Replace the three hardcoded blog post components with a single dynamic post page driven by the `blog_posts` table in Lovable Cloud, and make the blog index fetch live rows.

## Steps

**1. Verify the `blog_posts` table**
Confirm the table exists with `slug, title, excerpt, body, meta_description, is_published, published_at`. If it doesn't exist, create it with public read access for published rows only (`GRANT SELECT` to anon/authenticated, RLS policy `is_published = true`) and seed it with the three current posts so nothing disappears from the live blog.

**2. New `src/pages/blog/BlogPostPage.tsx`**
- Read `slug` from `useParams()`.
- Fetch the single row where `slug = :slug AND is_published = true`.
- Loading state (simple spinner/skeleton), and a "Post not found" state with a link back to `/blog` when nothing matches.
- Wrap in `BlogShell`, same typography classes as the current post pages.
- `<Helmet>`: title `{title} | Narayaneeyam App`, meta description from `meta_description` (fallback `excerpt`), og:title/description/url/type=article, canonical to `https://narayaneeyam.app/blog/{slug}`, plus Article JSON-LD using `published_at`.
- Render `body` HTML via `dangerouslySetInnerHTML` inside a scoped wrapper that styles `h2/h3/p/ul/li` to match the existing blog look. Sanitize the HTML with DOMPurify before rendering.
- Keep the `InstagramFollow` CTA block and the "Start Your Chanting Journey" CTA at the end.

**3. Update `src/pages/blog/BlogIndexPage.tsx`**
- Replace the hardcoded `posts` array with a query for all published rows ordered by `published_at desc`.
- Layout, styling and the Blog/BlogPosting JSON-LD stay identical, just driven by fetched data.
- Add loading and empty states.

**4. Routing cleanup in `App.tsx`**
- Remove the three per-post routes and imports.
- Add `<Route path="/blog/:slug" element={<BlogPostPage />} />` after `/blog`.
- Delete `HowChantingGavePeace.tsx`, `HundredDayParayanam.tsx`, `LearnNarayaneeyamBeginners.tsx`.

## Technical notes
- Both pages use TanStack Query (already configured) with the existing `supabase` client.
- `LandingBlog.tsx` (the inline "What is Narayaneeyam?" section on the landing page) is untouched.
- `public/sitemap.xml` currently lists the three post URLs — they keep working under the dynamic route, so no change needed unless you add new posts later.
- SEO tradeoff: hardcoded posts were in the JS bundle at first paint; fetched posts render after a network round-trip. Googlebot executes JS and will still index them, but non-JS social preview crawlers will only see the static `index.html` head. Say the word if you want per-post previews to stay crawler-perfect — that needs SSR.
