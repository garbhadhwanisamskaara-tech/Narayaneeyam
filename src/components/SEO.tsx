import { Helmet } from "react-helmet-async";

interface SEOProps {
  /** Path of the current page, e.g. "/", "/about" */
  path: string;
  title?: string;
  description?: string;
  /** Absolute URL to the social share image */
  image?: string;
  /** Optional JSON-LD structured data object (or array) */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Override robots directive (default: "index, follow") */
  robots?: string;
}

const SITE = "https://www.narayaneeyam.app";
const DEFAULT_IMAGE =
  "https://znglsaxfyhkuzyrfbuhn.supabase.co/storage/v1/object/public/images/SNlogo.png";

export default function SEO({
  path,
  title,
  description,
  image,
  jsonLd,
  robots = "index, follow",
}: SEOProps) {
  const url = `${SITE}${path === "/" ? "/" : path}`;
  const ogImage = image || DEFAULT_IMAGE;
  const ogTitle = title || "Sriman Narayaneeyam — Chant · Learn · Grow";
  const ogDesc =
    description ||
    "Chant, learn and grow with the 1,034-verse Sriman Narayaneeyam — synchronised audio, translations and a daily devotional practice.";

  return (
    <Helmet>
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      <meta name="robots" content={robots} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Sriman Narayaneeyam" />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDesc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={ogDesc} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
