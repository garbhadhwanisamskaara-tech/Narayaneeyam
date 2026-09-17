import { useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { faqSections, GROUP_PARAYANAM_ANSWER_KEY, groupParayanamAnswers } from "@/data/faqData";
import { useCapabilities } from "@/hooks/useCapabilities";
import SEO from "@/components/SEO";

export default function FaqPage() {
  const { canConfigurePayments } = useCapabilities();
  const resolveAnswer = (a: string) =>
    a === GROUP_PARAYANAM_ANSWER_KEY
      ? canConfigurePayments
        ? groupParayanamAnswers.web
        : groupParayanamAnswers.twa
      : a;

  useEffect(() => {
    document.title = "FAQ — Sriman Narayaneeyam App";
    const meta = document.querySelector('meta[name="description"]');
    const desc =
      "Frequently asked questions about the Narayaneeyam app — learn how to chant, use the Chant and Listen modules, track progress, and more.";
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
      <SEO path="/faq" title="FAQ — Sriman Narayaneeyam" description="Frequently asked questions about the Narayaneeyam app — chanting, features, and more." />
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
                    {resolveAnswer(faq.a)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-lg border border-border bg-muted/40 px-5 py-6 text-center">
        <h2 className="font-display text-lg font-semibold text-foreground mb-1">Still need help?</h2>
        <p className="text-sm font-sans text-muted-foreground mb-4">Didn't find your answer above?</p>
        <Link
          to="/support"
          className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-sans font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Raise a Ticket
        </Link>
      </div>
    </div>
  );
}
