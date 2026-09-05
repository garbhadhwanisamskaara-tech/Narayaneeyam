import { motion } from "framer-motion";
import {
  BookOpen,
  Headphones,
  Music,
  BarChart3,
  Heart,
  Languages,
  Sparkles,
  Play,
  Users,
  CalendarDays,
  Bell,
  CreditCard,
  LifeBuoy,
  UserCog,
  ListMusic,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import SEO from "@/components/SEO";

const sections = [
  {
    id: "getting-started",
    icon: <Play className="h-5 w-5 text-primary" />,
    title: "Getting Started",
    items: [
      {
        q: "How do I open the app?",
        a: "Open narayaneeyam.app in any browser — phone, tablet or computer. Nothing needs to be downloaded; there is no separate App Store or Play Store app. You can add the site to your home screen and it will open full-screen like an installed app.",
      },
      {
        q: "How do I create an account?",
        a: "Tap Begin Journey or the Sign In icon and choose Create Account. Enter your email and a password, or continue with Google. During sign-up you also choose your preferred script and translation language — both can be changed later.",
      },
      {
        q: "How do I verify my email?",
        a: "After signing up with email, we send you a confirmation link. Open it and your account is verified. Until then the app shows the Verify Email screen; you can request the mail again from there if it has not arrived (do check your spam folder).",
      },
      {
        q: "How do I sign in, and what if I forget my password?",
        a: "Sign in with your email and password, or with Google. If you have forgotten your password, use 'Forgot password' on the sign-in page and follow the reset link sent to your email.",
      },
      {
        q: "How do I navigate the app?",
        a: "On mobile use the bottom bar — Home, Chant, Listen, Progress and More. On desktop use the top navigation. The 'More' menu holds Script Library, Festival Parayanams, Prasadam Guide, Saved Places, Favourites, Playlists, Blog, FAQ, Support and Settings. Your avatar at the top right opens account options and Sign Out.",
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
        a: "On the Chant page, open the Dashakam selector. All 100 Dashakams are listed so you can see the whole journey. Tap the one you wish to chant.",
      },
      {
        q: "Why are some dashakams shown as 'Coming soon'?",
        a: "Recordings are being published dashakam by dashakam. A dashakam that is not yet published is greyed out with a 'Coming soon' label and cannot be opened. New ones appear on their own as they are released — nothing to update on your side.",
      },
      {
        q: "How do I play and pause?",
        a: "Tap Play to begin and tap again to pause. Playback resumes from where you paused. Use the forward and back arrows to move between verses.",
      },
      {
        q: "How do I change the speed?",
        a: "The speed control offers 0.6×, 0.75×, 1×, 1.25× and 1.5×. Slow it down while learning a new verse and return to 1× once the words feel familiar.",
      },
      {
        q: "How do I use Loop?",
        a: "Set the loop count to repeat the current verse or dashakam automatically — ideal for memorising through repetition.",
      },
      {
        q: "How does the text highlighting work?",
        a: "As the audio plays, the line being chanted is highlighted in gold and the page scrolls to keep it centred, so you can follow along without losing your place.",
      },
    ],
  },
  {
    id: "meaning",
    icon: <BookOpen className="h-5 w-5 text-primary" />,
    title: "Understanding the Verses",
    items: [
      {
        q: "Where do I see the meaning of a verse?",
        a: "Use the meaning icon or 'Show Meaning' on the Chant page. The translation appears with the verse, in your preferred translation language.",
      },
      {
        q: "What are benefits, remarks and prasadam?",
        a: "Each dashakam carries its traditional benefit and, where relevant, remarks — special instructions such as an additional sloka to recite after a particular verse. Verses that have a prescribed prasadam show it on the verse, and the Prasadam Guide lists them all together.",
      },
    ],
  },
  {
    id: "podcast",
    icon: <Headphones className="h-5 w-5 text-primary" />,
    title: "Listen",
    items: [
      {
        q: "How do I listen to Dashakam episodes?",
        a: "Open Listen and choose a published Dashakam. The full episode plays end to end, with the same speed and loop controls as Chant.",
      },
      {
        q: "Can I listen in the background?",
        a: "Yes. Once playback starts you can switch apps or lock your screen and the audio continues, with play and pause available from your device's media controls.",
      },
    ],
  },
  {
    id: "languages",
    icon: <Languages className="h-5 w-5 text-primary" />,
    title: "Script, Language and Text Size",
    items: [
      {
        q: "Which languages are available?",
        a: "The verses are published in Sanskrit (Devanagari) with transliterations and meanings in English, Tamil, Telugu, Malayalam, Kannada, Hindi and Marathi. Coverage grows as each dashakam is published.",
      },
      {
        q: "How do I change my script and translation language?",
        a: "Open My Preferences and set your preferred script language and translation language. Everything you read in the app — verses, dashakam names, benefits, remarks and prasadam — follows those settings, falling back to English where a translation is not yet available.",
      },
      {
        q: "How do I change the text size?",
        a: "My Preferences has a Text Size setting. Choose the size that reads most comfortably and it applies across the verse displays.",
      },
      {
        q: "What is the Script Library?",
        a: "The Script Library lets you read the verses in the script of your choice without playing audio — useful for silent reading or for dashakams you prefer to follow from the text.",
      },
    ],
  },
  {
    id: "collections",
    icon: <Heart className="h-5 w-5 text-primary" />,
    title: "Bookmarks, Favourites and Playlists",
    items: [
      {
        q: "How do bookmarks work?",
        a: "Tap the gold ribbon on a verse to bookmark it. All bookmarks are collected under Saved Places so you can return to a spot quickly.",
      },
      {
        q: "How do favourites work?",
        a: "Tap the heart on a verse you love. Favourites are gathered in the Heart Shelf and shown in your chosen language.",
      },
      {
        q: "How do I build a playlist?",
        a: "Use the Playlist Builder to arrange verses or dashakams in the order you want, set how many times each item loops, and play the whole sequence as one session.",
      },
    ],
  },
  {
    id: "progress",
    icon: <BarChart3 className="h-5 w-5 text-primary" />,
    title: "Tracking Your Progress",
    items: [
      {
        q: "What does the Progress page show?",
        a: "Your dashboard shows how many of the 100 Dashakams you have completed, minutes chanted, sessions and your daily streak — a gentle picture of your practice over time.",
      },
      {
        q: "How do I continue where I left off?",
        a: "The app remembers your last position. When you return, a Continue banner takes you straight back to that dashakam and verse.",
      },
      {
        q: "How do streaks work?",
        a: "Each day you chant adds a day to your streak. Consistency matters more than duration — even a few minutes keeps it going.",
      },
    ],
  },
  {
    id: "groups",
    icon: <Users className="h-5 w-5 text-primary" />,
    title: "Groups and Group Parayanams",
    items: [
      {
        q: "What is a group?",
        a: "A group is your own private circle — family, friends or a satsang. Create a group from the Groups page, give it a name, and invite others with a link. It is not a public or live global chanting room.",
      },
      {
        q: "How do I invite people?",
        a: "Open your group and share the invite link. When someone opens it while signed in, they join the group. The group switcher at the top lets you move between the groups you belong to.",
      },
      {
        q: "How do I organise a parayanam?",
        a: "As group owner, choose 'Add a Parayanam', give it a name and dates, pick the dashakams (you can start from a template such as Sampoorna or Mini, or select your own), choose whether everyone chants the same dashakam or the dashakams are split among participants, then invite the participants and start it.",
      },
      {
        q: "How do invitations work for members?",
        a: "Invited members see the parayanam under pending invitations and can accept or decline. Only participants see the parayanam's progress views.",
      },
      {
        q: "What is the Lotus Garden?",
        a: "The Lotus Garden is the parayanam's progress grid. Each tile is a dashakam; tap your assigned tile to mark it complete. Tiles bloom in proportion to how many participants have finished them, and the schedule views (Full Schedule and My Schedule) update alongside.",
      },
      {
        q: "How do I manage a group or a parayanam?",
        a: "Owners get 'Manage Group' (rename, remove a member, dissolve) and 'Manage Parayanam' (remove a participant, with the option to redistribute their dashakams). Members see 'Leave Group'. A group can run more than one parayanam at a time — use the parayanam switcher to choose which one you are viewing.",
      },
    ],
  },
  {
    id: "festivals",
    icon: <CalendarDays className="h-5 w-5 text-primary" />,
    title: "Festival Parayanams and Prasadam Guide",
    items: [
      {
        q: "What are Festival Parayanams?",
        a: "A read-only list of festival days with the dashakams traditionally chanted on each and the benefits associated with them. Upcoming festivals appear first; past ones stay collapsed below.",
      },
      {
        q: "What is the Prasadam Guide?",
        a: "A list of the prasadam prescribed for particular dashakams and verses, in your chosen language where available, so you know what to prepare before you begin.",
      },
    ],
  },
  {
    id: "reminders",
    icon: <Bell className="h-5 w-5 text-primary" />,
    title: "Daily Reminders",
    items: [
      {
        q: "How do I turn on reminders?",
        a: "Open My Preferences and enable parayanam reminders. Your browser will ask permission to show notifications; once allowed, the app can send you a gentle nudge at your chosen time. You can switch them off from the same place.",
      },
    ],
  },
  {
    id: "account",
    icon: <UserCog className="h-5 w-5 text-primary" />,
    title: "Your Account",
    items: [
      {
        q: "How do I change my password?",
        a: "My Preferences has a Change Password section — enter a new password and save.",
      },
      {
        q: "How do I delete my account?",
        a: "The Danger Zone in My Preferences has Delete My Account. If you own a group, the app first asks you to transfer ownership to another member (or dissolve the group), then removes your account and personal data. This cannot be undone.",
      },
      {
        q: "How do I sign out?",
        a: "Tap your avatar and choose Sign Out — it is the last item in the account menu on both mobile and desktop.",
      },
    ],
  },
  {
    id: "subscription",
    icon: <CreditCard className="h-5 w-5 text-primary" />,
    title: "Subscription and Payments",
    items: [
      {
        q: "What does my access include right now?",
        a: "Every verified account is on the launch trial, which runs until 31 December 2026, followed by a 7-day grace period. The app shows a banner as the date approaches.",
      },
      {
        q: "Where do I see plans and subscribe?",
        a: "The Subscribe page lists the current plans, durations and prices. Payment is handled securely through Razorpay.",
      },
      {
        q: "Where are my receipts?",
        a: "Payment History in the account menu lists your payments with their dates, amounts and status.",
      },
    ],
  },
  {
    id: "support",
    icon: <LifeBuoy className="h-5 w-5 text-primary" />,
    title: "Support",
    items: [
      {
        q: "How do I report a problem or ask a question?",
        a: "Open Support and raise a ticket describing the issue — you can attach a screenshot. Your tickets and our replies stay on the same page so you can follow the conversation.",
      },
    ],
  },
  {
    id: "playlist-tips",
    icon: <ListMusic className="h-5 w-5 text-primary" />,
    title: "Tips for the Best Experience",
    items: [
      { q: "🎧  Use headphones", a: "For the clearest audio and a more immersive experience, headphones or earphones are recommended." },
      { q: "🪔  Chant along daily", a: "Even 10 minutes of daily chanting brings immense peace. Consistency is more powerful than duration." },
      { q: "🌱  Start with Dashakam 1", a: "If you are new to Narayaneeyam, begin with the first Dashakam. Each one builds upon the previous, like a beautiful garland of devotion." },
      { q: "📖  Slow down, then flow", a: "Chant a verse at 0.6× or 0.75× until the words feel familiar, then return to normal speed to experience the full flow." },
    ],
  },
];

const UserGuidePage = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        path="/user-guide"
        title="User Guide — Sriman Narayaneeyam"
        description="Step-by-step guide to every feature of the Sriman Narayaneeyam app — chanting, listening, languages, groups, parayanams, reminders and account settings."
      />
      {/* Hero */}
      <div className="bg-gradient-peacock text-primary-foreground py-10 px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">How to Use Narayaneeyam App</h1>
          <p className="text-base md:text-lg max-w-2xl mx-auto opacity-90">
            Welcome, dear devotee! 🙏 This guide walks you through every feature of the app as it works today — from
            creating your account to chanting, listening, joining a group parayanam and managing your settings.
            No technical knowledge needed — just an open heart.
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
                        <p className="font-medium text-foreground mb-1">{item.q}</p>
                        <p className="text-muted-foreground text-sm leading-relaxed">{item.a}</p>
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
