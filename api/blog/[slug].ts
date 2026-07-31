// api/blog/[slug].ts
export default async function handler(req: any, res: any) {
  const { slug } = req.query;

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.${slug}&is_published=eq.true&select=html`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  const data = await response.json();

  if (!data || data.length === 0 || !data[0].html) {
    res.status(404).send("<h1>Post not found</h1>");
    return;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(data[0].html);
}
