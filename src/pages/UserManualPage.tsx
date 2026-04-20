import { useEffect, useState } from "react";
import { BookOpen, ChevronRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import SEO from "@/components/SEO";

interface Section {
  title: string;
  content: string;
}

function parseMarkdownSections(md: string): Section[] {
  const lines = md.split("\n");
  const sections: Section[] = [];
  let currentTitle = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentTitle) {
        sections.push({ title: currentTitle, content: currentLines.join("\n").trim() });
      }
      currentTitle = line.replace(/^##\s+/, "");
      currentLines = [];
    } else if (currentTitle) {
      currentLines.push(line);
    }
  }
  if (currentTitle) {
    sections.push({ title: currentTitle, content: currentLines.join("\n").trim() });
  }
  return sections;
}

function renderContent(content: string) {
  // Simple markdown-to-JSX: headers, bold, tables, code blocks, tips/warnings, lists
  const lines = content.split("\n");
  const elements: JSX.Element[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Sub-headings
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-base font-semibold text-foreground mt-5 mb-2 font-display">
          {line.replace(/^###\s+/, "")}
        </h3>
      );
      i++;
      continue;
    }

    // Tip/Warning callouts
    if (line.startsWith("> 💡") || line.startsWith("> ⚠️")) {
      const isWarning = line.startsWith("> ⚠️");
      const text = line.replace(/^>\s*[💡⚠️]\s*/, "").replace(/\*\*/g, "");
      elements.push(
        <div key={i} className={`rounded-lg px-4 py-3 my-3 text-sm font-sans ${isWarning ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-secondary/10 text-secondary-foreground border border-secondary/20"}`}>
          <span className="mr-1">{isWarning ? "⚠️" : "💡"}</span> {text}
        </div>
      );
      i++;
      continue;
    }

    // Block quotes (other)
    if (line.startsWith("> ")) {
      const text = line.replace(/^>\s*/, "");
      elements.push(
        <blockquote key={i} className="border-l-2 border-muted-foreground/30 pl-4 my-2 text-sm text-muted-foreground italic font-sans">
          {text}
        </blockquote>
      );
      i++;
      continue;
    }

    // Table detection
    if (line.includes("|") && i + 1 < lines.length && lines[i + 1]?.match(/^\|[\s\-|]+\|$/)) {
      const headerCells = line.split("|").filter(c => c.trim()).map(c => c.trim().replace(/\*\*/g, ""));
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(lines[i].split("|").filter(c => c.trim()).map(c => c.trim().replace(/\*\*/g, "")));
        i++;
      }
      elements.push(
        <div key={`table-${i}`} className="overflow-x-auto my-4">
          <table className="w-full text-sm font-sans border border-border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-muted/50">
                {headerCells.map((h, hi) => (
                  <th key={hi} className="px-3 py-2 text-left font-semibold text-foreground border-b border-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-muted-foreground border-b border-border/50">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Code blocks
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre key={`code-${i}`} className="bg-muted/50 border border-border rounded-lg px-4 py-3 my-3 overflow-x-auto text-xs font-mono text-foreground">
          {codeLines.join("\n")}
        </pre>
      );
      continue;
    }

    // Numbered lists
    if (line.match(/^\d+\.\s/)) {
      const text = line.replace(/^\d+\.\s/, "");
      elements.push(
        <div key={i} className="flex gap-2 my-1 text-sm font-sans text-foreground/90">
          <ChevronRight className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
          <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code class="bg-muted px-1 rounded text-xs">$1</code>') }} />
        </div>
      );
      i++;
      continue;
    }

    // Bullet lists
    if (line.match(/^[-*]\s/)) {
      const text = line.replace(/^[-*]\s/, "");
      elements.push(
        <div key={i} className="flex gap-2 my-1 text-sm font-sans text-foreground/90 ml-2">
          <span className="text-secondary mt-0.5">•</span>
          <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code class="bg-muted px-1 rounded text-xs">$1</code>') }} />
        </div>
      );
      i++;
      continue;
    }

    // Horizontal rules
    if (line.match(/^---+$/)) {
      elements.push(<hr key={i} className="my-6 border-border" />);
      i++;
      continue;
    }

    // Regular paragraphs
    if (line.trim()) {
      elements.push(
        <p key={i} className="text-sm font-sans text-foreground/85 my-2 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>').replace(/`(.*?)`/g, '<code class="bg-muted px-1 rounded text-xs font-mono">$1</code>') }}
        />
      );
    }
    i++;
  }
  return <>{elements}</>;
}

export default function UserManualPage() {
  const [content, setContent] = useState<string>("");
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    document.title = "User Manual — Sriman Narayaneeyam App";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement("meta"); meta.setAttribute("name", "description"); document.head.appendChild(meta); }
    meta.setAttribute("content", "Complete admin user manual for managing dashakams, verses, audio, and multilingual content in the Narayaneeyam app.");
  }, []);

  useEffect(() => {
    fetch("/docs/Admin_User_Manual.md")
      .then((res) => res.text())
      .then((md) => {
        setContent(md);
        setSections(parseMarkdownSections(md));
      })
      .catch(() => setContent("Unable to load the manual. Please try again later."));
  }, []);

  if (!sections.length && !content) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl text-center">
        <p className="text-muted-foreground font-sans animate-pulse">Loading manual…</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl pb-24">
      <SEO path="/user-manual" title="User Manual — Sriman Narayaneeyam" description="Comprehensive user manual for the Sriman Narayaneeyam app — features, navigation and how to chant effectively." />
      {/* Hero */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">User Manual</h1>
          <p className="text-xs text-muted-foreground font-sans">Narayaneeyam Sadhana — Admin Guide</p>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="rounded-xl border border-border bg-card p-4 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-3 font-sans">Contents</h2>
        <div className="grid gap-1">
          {sections.map((s, idx) => (
            <button
              key={idx}
              className="flex items-center gap-2 text-left text-sm font-sans text-muted-foreground hover:text-foreground transition-colors py-1"
              onClick={() => {
                const el = document.getElementById(`section-${idx}`);
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <span className="text-xs text-secondary font-mono w-5 text-right">{idx + 1}.</span>
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Accordion sections */}
      <Accordion type="multiple" className="space-y-2">
        {sections.map((section, idx) => (
          <AccordionItem key={idx} value={`section-${idx}`} id={`section-${idx}`} className="border border-border rounded-xl overflow-hidden bg-card px-1">
            <AccordionTrigger className="px-4 py-3 text-sm font-display font-semibold text-foreground hover:no-underline">
              <span className="flex items-center gap-2">
                <span className="text-xs text-secondary font-mono">{String(idx + 1).padStart(2, "0")}</span>
                {section.title}
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {renderContent(section.content)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
