import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SEO from "@/components/SEO";

interface PrasadamEntry {
  dashakam_no: number;
  verse_no: number;
  prasadam_text: string;
}

export default function PrasadamListPage() {
  const [entries, setEntries] = useState<PrasadamEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("prasadam")
        .select("dashakam_no, verse_no, prasadam_text")
        .eq("language_code", "en")
        .order("dashakam_no")
        .order("verse_no");
      if (data) setEntries(data as PrasadamEntry[]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">Prasadam List</h1>
        <p className="text-sm text-muted-foreground mb-6 font-sans">Loading…</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <SEO path="/prasadam" title="Prasadam List — Sriman Narayaneeyam" description="Recommended prasadam offerings for every Dashakam and verse of Sriman Narayaneeyam." />
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">Prasadam List</h1>
      <p className="text-sm text-muted-foreground mb-6 font-sans">
        Recommended offerings for each Dashakam and verse
      </p>

      {/* Mobile-friendly card list */}
      <div className="block lg:hidden space-y-2">
        {entries.map((e, idx) => (
          <div key={idx} className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-foreground font-sans">
                Dashakam {e.dashakam_no} · Verse {e.verse_no}
              </span>
            </div>
            <p className="text-sm text-primary font-sans font-medium mt-1">{e.prasadam_text}</p>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground font-sans text-center py-8">No prasadam data available yet</p>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-sans">Dashakam</TableHead>
              <TableHead className="font-sans">Verse</TableHead>
              <TableHead className="font-sans">Prasadam</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-sans font-medium">{e.dashakam_no}</TableCell>
                <TableCell className="font-sans">{e.verse_no}</TableCell>
                <TableCell className="font-sans text-primary font-medium">{e.prasadam_text}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
