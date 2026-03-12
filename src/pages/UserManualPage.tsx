import { useEffect, useState } from "react";

export default function UserManualPage() {
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    fetch("/docs/Admin_User_Manual.md")
      .then((res) => res.text())
      .then(setContent)
      .catch(() => setContent("Unable to load the manual. Please try again later."));
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-foreground mb-4">User Manual</h1>
      <div className="prose prose-sm dark:prose-invert font-sans max-w-none whitespace-pre-wrap">
        {content || <p className="text-muted-foreground">Loading…</p>}
      </div>
    </div>
  );
}
