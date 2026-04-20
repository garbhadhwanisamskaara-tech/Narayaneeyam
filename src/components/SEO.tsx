import { Helmet } from "react-helmet-async";

interface SEOProps {
  /** Path of the current page, e.g. "/", "/about" */
  path: string;
  title?: string;
  description?: string;
}

const SITE = "https://www.narayaneeyam.app";

export default function SEO({ path, title, description }: SEOProps) {
  const url = `${SITE}${path === "/" ? "" : path}`;
  return (
    <Helmet>
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      <meta name="robots" content="index, follow" />
    </Helmet>
  );
}
