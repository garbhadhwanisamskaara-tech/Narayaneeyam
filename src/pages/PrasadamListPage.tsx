import { sampleDashakams } from "@/data/narayaneeyam";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function PrasadamListPage() {
  // Collect all prasadam entries from all dashakams
  const entries = sampleDashakams
    .flatMap((d) =>
      d.prasadam_info.map((p) => ({
        dashakam: d.id,
        dashakam_name: d.title_english,
        verse: p.verse,
        prasadam: p.item,
      }))
    )
    .sort((a, b) => a.dashakam - b.dashakam || a.verse - b.verse);

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">
        Prasadam List
      </h1>
      <p className="text-sm text-muted-foreground mb-6 font-sans">
        Recommended offerings for each Dashakam and verse
      </p>

      {/* Mobile-friendly card list */}
      <div className="block lg:hidden space-y-2">
        {entries.map((e, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-border bg-card px-4 py-3"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-foreground font-sans">
                Dashakam {e.dashakam} · Verse {e.verse}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-sans">{e.dashakam_name}</p>
            <p className="text-sm text-primary font-sans font-medium mt-1">{e.prasadam}</p>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-sans">Dashakam</TableHead>
              <TableHead className="font-sans">Name</TableHead>
              <TableHead className="font-sans">Verse</TableHead>
              <TableHead className="font-sans">Prasadam</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-sans font-medium">{e.dashakam}</TableCell>
                <TableCell className="font-sans text-muted-foreground">{e.dashakam_name}</TableCell>
                <TableCell className="font-sans">{e.verse}</TableCell>
                <TableCell className="font-sans text-primary font-medium">{e.prasadam}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
