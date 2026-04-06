import { useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqSections = [
  {
    heading: "Getting Started",
    questions: [
      {
        q: "What is the primary goal of the Narayaneeyam app?",
        a: "The app is designed to make the 1,034 verses of the Narayaneeyam accessible to everyone. Whether you want to master the complex Sanskrit prosody through our Repeat Module, listen devotionally like a podcast, or chant along in real-time, the app scales to your personal spiritual pace.",
      },
      {
        q: "What is Narayaneeyam?",
        a: "Narayaneeyam is a devotional Sanskrit text composed by Melpathur Narayana Bhattathiri, condensing the Bhagavata Purana into 1034 shlokas across 100 Dashakams. This app helps you chant, learn, and listen to it.",
      },
      {
        q: "Is the app free to use?",
        a: "Yes, the core features — Chant, Learn, and Podcast — are free for all users.",
      },
      {
        q: "Do I need to create an account?",
        a: "You can browse and listen without an account. An account is needed to save your progress, bookmarks, and chanting history.",
      },
      {
        q: "Is the app available on mobile?",
        a: "Yes, narayaneeyam.app works on any smartphone browser. Just open it in Chrome or Safari — no download needed.",
      },
      {
        q: "Why should I use the app instead of a printed book?",
        a: "While books are sacred, the app offers audio-visual synchronization. You get the benefit of hearing the correct intonations, pronunciations and where to break the phrase to fit in the meter and tune. You can follow a printed book while listening on the app and make notes to help you chant independently.",
      },
    ],
  },
  {
    heading: "Chant Module",
    questions: [
      {
        q: "How does the Chant feature work?",
        a: "Think of this as your digital prayer companion. The app displays the text on screen when the audio is played, helping you maintain the correct rhythm, meter, tune and speed — which is crucial for traditional Narayaneeyam recitation.",
      },
      {
        q: "Can I chant at my own pace?",
        a: "Yes — use the speed control (0.5x, 1x, 1.5x, 2x) to slow down or speed up the audio to match your comfort level.",
      },
      {
        q: "What is the Loop feature?",
        a: "Loop repeats a shloka or dashakam automatically so you can practice chanting without manually replaying.",
      },
      {
        q: "Can I chant a specific dashakam directly?",
        a: "Yes — use the Dashakam dropdown to jump to any of the 100 dashakams directly.",
      },
      {
        q: "What language script is used for the shlokas?",
        a: "Sanskrit in Devanagari script is the default. Transliteration is also available in Tamil, English and Kannada. We plan to add more languages.",
      },
      {
        q: "Can I customize the speed of chanting?",
        a: "Everyone learns at a different pace. You can slow it down while in learning mode and increase it to normal speed once you are ready to chant along. You can also set up a loop to repeat a particular dashakam several times.",
      },
    ],
  },
  {
    heading: "Learn Module",
    questions: [
      {
        q: "I am a beginner. How does the Learn with Me module help me?",
        a: "Sanskrit can be intimidating! Our Learn with Me module breaks down each shloka into phrases with a gap between them — giving you space to repeat each phrase twice, just like in our regular classes, so you can perfect your pronunciation before moving to the next verse.",
      },
      {
        q: "How is the Learn module different from Chant?",
        a: "Learn focuses on understanding — after each phrase there is a gap for you to repeat it twice. Chant is continuous reading from the screen in the respective tune.",
      },
      {
        q: "Are the meanings available in English?",
        a: "Yes, English meanings are provided for each shloka to help devotees who are not familiar with Sanskrit.",
      },
      {
        q: "Can I bookmark shlokas I want to revisit?",
        a: "Yes — tap the bookmark icon on any shloka to save it to your favourites for quick access later.",
      },
    ],
  },
  {
    heading: "Podcast Module",
    questions: [
      {
        q: "What is the Podcast section?",
        a: "The Podcast features full audio episodes on each Dashakam — ideal for listening during commute, walks, or daily routines.",
      },
      {
        q: "Can I use the app while commuting or working?",
        a: "Absolutely. The Podcast mode lets you play entire Dashakams in the background, allowing the healing vibrations of Narayaneeyam to fill your environment even when you are not looking at the screen.",
      },
      {
        q: "Can I listen offline?",
        a: "Currently the app requires an internet connection. Offline support may be added in a future update.",
      },
      {
        q: "How long is each podcast episode?",
        a: "Duration depends on the dashakam you choose, the loop setting, and the playback speed.",
      },
    ],
  },
  {
    heading: "Progress and Account",
    questions: [
      {
        q: "Can I track my progress?",
        a: "Yes. Learning 100 Dashakams is a journey. Once logged in, the app tracks which dashakams you have chanted and learned, and allows you to mark verses as Mastered or In Progress — so you can pick up exactly where you left off.",
      },
      {
        q: "Can I create a custom playlist?",
        a: "Yes — you can create playlists of your favourite shlokas or dashakams for a personalised chanting session.",
      },
      {
        q: "Is my data private and secure?",
        a: "Yes — your account data and chanting recordings are stored securely and are only accessible to you.",
      },
    ],
  },
  {
    heading: "Support",
    questions: [
      {
        q: "Who can I contact for support or feedback?",
        a: "You can reach us through the Support section in the app menu. We welcome all feedback to help improve the experience for devotees worldwide.",
      },
    ],
  },
];

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
