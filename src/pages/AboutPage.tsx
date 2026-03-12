export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-foreground mb-4">About</h1>
      <div className="prose prose-sm dark:prose-invert font-sans">
        <p>
          <strong>Narayaneeyam Sadhana</strong> is a devotional web application designed to help
          devotees chant, learn, and grow through the sacred text of Sriman Narayaneeyam — a
          1,034-verse hymn composed by Melpathur Narayana Bhattathiri at the Guruvayur Temple.
        </p>
        <h2>Features</h2>
        <ul>
          <li><strong>Chant with Me</strong> — Audio-guided chanting with lyrics highlighting</li>
          <li><strong>Learn with Me</strong> — Structured lessons for learning verses</li>
          <li><strong>Devotion Pathways</strong> — Curated chanting journeys including Mini Narayaneeyam, Festival Pathways, and 100-Day Journey</li>
          <li><strong>Podcast</strong> — Listen to Dashakams in sequence</li>
          <li><strong>Prasadam List</strong> — Recommended offerings for each Dashakam</li>
        </ul>
        <h2>Credits</h2>
        <p>
          Built with devotion for the global community of Narayaneeyam chanters.
        </p>
      </div>
    </div>
  );
}
