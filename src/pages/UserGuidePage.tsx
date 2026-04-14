import { motion } from "framer-motion";
import { BookOpen, Headphones, Music, BarChart3, Heart, Languages, Sparkles, Play } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const sections = [
  {
    id: "getting-started",
    icon: <Play className="h-5 w-5 text-primary" />,
    title: "Getting Started",
    items: [
      {
        q: "How do I open the app?",
        a: "Simply open the app link in any browser — on your phone, tablet, or computer. No download is needed. You can also add it to your phone's home screen for easy access, just like a regular app.",
      },
      {
        q: "How do I create an account and sign in?",
        a: "Tap the Sign In icon at the top right corner. You can sign up with your email address or use Google sign-in. Once signed in, your progress and favourites are saved automatically.",
      },
      {
        q: "How do I navigate the app?",
        a: "On mobile, use the bottom menu to quickly access Home, Chant, Podcast, Progress, and More. On desktop, use the top navigation bar. The 'More' menu has additional options like Script Library, Bookmarks, Favourites, Support, and Settings.",
      },
    ],
  },
  {
    id: "chant",
    icon: <Music className="h-5 w-5 text-primary" />,
    title: "Chant with Me",
    items: [
      {
        q: "How do I select a Dashakam?",
        a: "On the Chant page, you'll see a list of all 100 Dashakams. Simply tap the one you wish to chant. You can also search by number or name.",
      },
      {
        q: "How do I play and pause the audio?",
        a: "Tap the Play button to start the chanting audio. Tap it again to pause at any time. The audio will pick up right where you left off.",
      },
      {
        q: "How do I adjust the speed?",
        a: "Use the Speed control (shown as 1x) to slow down or speed up the chanting. You can go from 0.5x (very slow, great for learning) up to 2x (for experienced chanters).",
      },
      {
        q: "How do I use the Loop feature?",
        a: "Tap the Loop icon to repeat the current verse continuously. This is wonderful for memorising a particular shloka through repeated listening and chanting along.",
      },
      {
        q: "How does the text highlighting work?",
        a: "As the audio plays, the words on screen are highlighted in sync with the chanting. This helps you follow along and learn the correct pronunciation naturally.",
      },
      {
        q: "How do I skip to the next or previous verse?",
        a: "Use the Forward and Back arrows next to the play button to move between verses within the Dashakam.",
      },
    ],
  },
  {
    id: "learn",
    icon: <BookOpen className="h-5 w-5 text-primary" />,
    title: "Learn Mode (inside Chant)",
    items: [
      {
        q: "How do I switch to Learn Mode?",
        a: "On the Chant page, you'll see a toggle at the top — 'Chant Mode' and 'Learn Mode'. Tap 'Learn Mode' to switch. The same dashakam and verse will be shown, but with learning-specific audio.",
      },
      {
        q: "How is Learn Mode different from Chant Mode?",
        a: "In Chant Mode, you listen to and chant along with the full verse. In Learn Mode, each verse is broken into smaller phrases so you can learn step by step, at your own pace.",
      },
      {
        q: "How do I learn at my own pace?",
        a: "Use the speed control to slow down to 0.5× or 0.75× for easier learning. You can pause at any time and rewind to listen again. Use the loop feature to repeat a verse as many times as you need — there's no rush in devotion.",
      },
      {
        q: "How do I see the meaning of a shloka?",
        a: "Tap the 'Show Meaning' button on the Chant page. The meaning (translation) will appear below each verse in English.",
      },
    ],
  },
  {
    id: "podcast",
    icon: <Headphones className="h-5 w-5 text-primary" />,
    title: "Podcast",
    items: [
      {
        q: "How do I listen to Dashakam episodes?",
        a: "Go to the Podcast section and select any Dashakam. The full episode audio will start playing. You can pause, resume, and skip just like any podcast.",
      },
      {
        q: "Can I listen in the background?",
        a: "Yes! Once you start playing, you can switch to other apps or lock your screen — the audio continues playing. Perfect for listening during your daily activities.",
      },
    ],
  },
  {
    id: "progress",
    icon: <BarChart3 className="h-5 w-5 text-primary" />,
    title: "Tracking Your Progress",
    items: [
      {
        q: "How do I see which verses I've completed?",
        a: "Visit your Dashboard to see a beautiful overview of your journey — which Dashakams you've chanted, your completion percentage, and how far you've come.",
      },
      {
        q: "How do I continue from where I left off?",
        a: "The app remembers your last position. When you return, you'll see a 'Continue' banner that takes you right back to where you were.",
      },
      {
        q: "How do streak days work?",
        a: "Each day you chant, your streak grows by one day. Maintaining a daily practice builds your streak — a gentle reminder of your devotion and consistency.",
      },
      {
        q: "How do I use bookmarks?",
        a: "Tap the Bookmark icon on any verse to save it for later. You can find all your bookmarked verses in the Saved Places section.",
      },
    ],
  },
  {
    id: "playlist",
    icon: <Heart className="h-5 w-5 text-primary" />,
    title: "Custom Playlist",
    items: [
      {
        q: "How do I create a playlist?",
        a: "Tap the Heart icon on any shloka you love. Your favourited shlokas are collected in the Heart Shelf, where you can play them as a continuous playlist — your personal collection of divine verses.",
      },
    ],
  },
  {
    id: "scripts",
    icon: <Languages className="h-5 w-5 text-primary" />,
    title: "Script Library",
    items: [
      {
        q: "How do I view shlokas in different scripts?",
        a: "Go to the Script Library and choose your preferred script and language. You can view the sacred verses in Devanagari, Malayalam, Tamil, Telugu, Kannada, and more.",
      },
    ],
  },
  {
    id: "tips",
    icon: <Sparkles className="h-5 w-5 text-primary" />,
    title: "Tips for the Best Experience",
    items: [
      {
        q: "🎧  Use headphones",
        a: "For the clearest audio and a more immersive experience, we recommend using headphones or earphones.",
      },
      {
        q: "🪔  Chant along daily",
        a: "Even 10 minutes of daily chanting brings immense peace. Consistency is more powerful than duration.",
      },
      {
        q: "🌱  Start with Dashakam 1",
        a: "If you are new to Narayaneeyam, begin with the first Dashakam. Each one builds upon the previous, like a beautiful garland of devotion.",
      },
      {
        q: "📖  Learn first, then Chant",
        a: "Switch to Learn Mode on the Chant page to understand the phrases at a slower speed, then switch back to Chant Mode to experience the full flow. This combination deepens both understanding and devotion.",
      },
    ],
  },
];

const UserGuidePage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-peacock text-primary-foreground py-10 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            How to Use Narayaneeyam App
          </h1>
          <p className="text-base md:text-lg max-w-2xl mx-auto opacity-90">
            Welcome, dear devotee! 🙏 This simple guide will walk you through
            every feature of the app so you can chant, learn, and grow in
            devotion with ease and joy. No technical knowledge needed — just
            an open heart.
          </p>
        </motion.div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Accordion type="multiple" className="space-y-4">
          {sections.map((section, idx) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.06 }}
            >
              <AccordionItem
                value={section.id}
                className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-sm"
              >
                <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/40 transition-colors">
                  <span className="flex items-center gap-3 text-lg font-semibold text-foreground">
                    {section.icon}
                    {section.title}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 pt-1">
                  <div className="space-y-4">
                    {section.items.map((item, i) => (
                      <div key={i} className="pl-2 border-l-2 border-primary/30">
                        <p className="font-medium text-foreground mb-1">
                          {item.q}
                        </p>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {item.a}
                        </p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>

        <div className="text-center mt-10 mb-6">
          <p className="text-muted-foreground italic text-sm">
            "With each verse, you walk a step closer to the divine." 🙏
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserGuidePage;
