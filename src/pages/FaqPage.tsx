import { useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqSections } from "@/data/faqData";

export default function FaqPage() {
  useEffect(() => {
    document.title = "FAQ — Sriman Narayaneeyam App";
    const meta = document.querySelector('meta[name="description"]');
    const desc =
      "Frequently asked questions about the Narayaneeyam app — learn how to chant, use the Learn and Podcast modules, track progress, and more.";
    if (meta) {
      meta.setAttribute("content", desc);
    } else {
      const tag = document.createElement("meta");
      tag.name = "description";
      tag.content = desc;
      document.head.appendChild(tag);
    }
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="font-display text-3xl font-bold text-foreground mb-2">
        Frequently Asked Questions
      </h1>
      <p className="text-muted-foreground font-sans text-sm mb-8">
        Everything you need to know about using Narayaneeyam Sadhana.
      </p>

      <div className="space-y-8">
        {faqSections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3 border-b border-border pb-2">
              {section.heading}
            </h2>
            <Accordion type="multiple" className="space-y-1">
              {section.questions.map((faq, idx) => (
                <AccordionItem
                  key={idx}
                  value={`${section.heading}-${idx}`}
                  className="border border-border rounded-lg px-4 data-[state=open]:bg-muted/40"
                >
                  <AccordionTrigger className="text-left text-sm font-sans font-medium text-foreground hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm font-sans text-muted-foreground leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
      </div>
    </div>
  );
}
