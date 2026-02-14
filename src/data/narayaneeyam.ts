// Sample data for Dashakam 1 - Admin will replace with full content
// This file demonstrates the data structure needed

export interface Verse {
  id: string;
  dashakam: number;
  paragraph: number;
  sanskrit: string;
  english: string;
  tamil: string;
  telugu: string;
  malayalam: string;
  meaning_english: string;
  meaning_tamil: string;
  meaning_telugu: string;
  meaning_malayalam: string;
  meter: string;
  prasadam?: string;
  bell?: boolean;
  benefits?: string;
}

export interface Dashakam {
  id: number;
  title_sanskrit: string;
  title_english: string;
  description: string;
  benefits?: string;
  prasadam?: string;
  verses: Verse[];
  imageUrl?: string;
}

export type Language = "sanskrit" | "english" | "tamil" | "telugu" | "malayalam";

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: "sanskrit", label: "Sanskrit" },
  { value: "english", label: "English" },
  { value: "tamil", label: "Tamil" },
  { value: "telugu", label: "Telugu" },
  { value: "malayalam", label: "Malayalam" },
];

// Sample data — Dashakam 1
export const sampleDashakams: Dashakam[] = [
  {
    id: 1,
    title_sanskrit: "भगवतः स्वरूपम्",
    title_english: "Bhagavatah Svarupam — The Form of the Lord",
    description: "Description of the divine form of Lord Narayana at Guruvayur",
    benefits: "Chanting this Dashakam bestows divine vision and peace of mind. It purifies the heart and awakens devotion.",
    prasadam: "Pal Payasam (Milk Kheer)",
    verses: [
      {
        id: "1-1",
        dashakam: 1,
        paragraph: 1,
        sanskrit: "सान्द्रानन्दावबोधात्मकमनुपमितं कालदेशावधिभ्यां\nनिर्मुक्तं नित्यमुक्तं निगमशतसहस्रेण निर्भास्यमानम् ।\nअस्पष्टं दृष्टमात्रे पुनरुरुपुरुषार्थात्मकं ब्रह्म तत्त्वं\nतत्तावद्भाति साक्षाद्गुरुपवनपुरे हन्त भाग्यं जनानाम् ॥",
        english: "Saandraanandaavabodhaatmakam anupamitam kaaladeshaavadhibhyaam\nNirmuktam nityamuktam nigamashatasahasrena nirbhaasyamaanam |\nAspastam drushtamaatre punarurupurushaartatmakam brahma tattvam\nTattaavadbhaati saakshaad gurupavanupure hanta bhaagyam janaanaam ||",
        tamil: "சாந்த்ராநந்தாவபோதாத்மகமநுபமிதம் காலதேசாவதிப்யாம்\nநிர்முக்தம் நித்யமுக்தம் நிகமசதஸஹஸ்ரேண நிர்பாஸ்யமானம் ।\nஅஸ்பஷ்டம் த்ருஷ்டமாத்ரே புநருருபுருஷார்தாத்மகம் ப்ரஹ்ம தத்வம்\nதத்தாவத்பாதி ஸாக்ஷாத்குருபவநபுரே ஹந்த பாக்யம் ஜநாநாம் ॥",
        telugu: "సాంద్రానందావబోధాత్మకమనుపమితం కాలదేశావధిభ్యాం\nనిర్ముక్తం నిత్యముక్తం నిగమశతసహస్రేణ నిర్భాస్యమానమ్ ।\nఅస్పష్టం దృష్టమాత్రే పునరురుపురుషార్థాత్మకం బ్రహ్మ తత్త్వం\nతత్తావద్భాతి సాక్షాద్గురుపవనపురే హన్త భాగ్యం జనానామ్ ॥",
        malayalam: "സാന്ദ്രാനന്ദാവബോധാത്മകമനുപമിതം കാലദേശാവധിഭ്യാം\nനിർമുക്തം നിത്യമുക്തം നിഗമശതസഹസ്രേണ നിർഭാസ്യമാനം ।\nഅസ്പഷ്ടം ദൃഷ്ടമാത്രേ പുനരുരുപുരുഷാർഥാത്മകം ബ്രഹ്മ തത്ത്വം\nതത്താവദ്ഭാതി സാക്ഷാദ്ഗുരുപവനപുരേ ഹന്ത ഭാഗ്യം ജനാനാം ॥",
        meaning_english: "That Brahman — the essence of intense bliss and consciousness, incomparable, free from the limitations of time and space, eternally liberated, illuminated by hundreds of thousands of Vedas, not clearly perceived by mere sight, yet the very embodiment of the supreme goal of life — that Reality shines directly in Guruvayur. Oh, the fortune of the people!",
        meaning_tamil: "அந்த பிரம்மம் — தீவிர ஆனந்தம் மற்றும் உணர்வின் சாரம், ஒப்பிடமுடியாதது, காலம் மற்றும் இடத்தின் வரம்புகளிலிருந்து விடுபட்டது — அந்த உண்மை குருவாயூரில் நேரடியாக ஒளிர்கிறது.",
        meaning_telugu: "ఆ బ్రహ్మము — తీవ్ర ఆనందం మరియు చైతన్యం యొక్క సారాంశం — ఆ వాస్తవం గురువాయూరులో ప్రత్యక్షంగా ప్రకాశిస్తుంది.",
        meaning_malayalam: "ആ ബ്രഹ്മം — തീവ്ര ആനന്ദത്തിന്റെയും ബോധത്തിന്റെയും സാരാംശം — ഗുരുവായൂരിൽ നേരിട്ട് പ്രകാശിക്കുന്നു.",
        meter: "Sragdharā",
      },
      {
        id: "1-2",
        dashakam: 1,
        paragraph: 2,
        sanskrit: "एवं दुर्लभ्यवस्तुन्यपि सुलभतया हस्तलब्धे यदन्यत्\nतन्वा वाचा धिया वा भजति बत जनः क्षुद्रतैव स्फुटेयम् ।\nएते तावद्वयं तु स्थिरतरमनसा विश्वपीडापहत्यै\nनिश्शेषात्मानमेनं गुरुपवनपुरेशं भजामो निरन्तम् ॥",
        english: "Evam durlabhyavastunya api sulabhatayaa hastalabdhe yadanyat\nTanvaa vaachaa dhiyaa vaa bhajati bata janah kshudrataiva sphuteyam |\nEte taavadvayam tu sthirataramanasaa vishvapeedaapahatyai\nNishsheshaatmaanam enam gurupavanapuresham bhajaamo nirantam ||",
        tamil: "ஏவம் துர்லப்யவஸ்துந்யபி ஸுலபதயா ஹஸ்தலப்தே யதன்யத்\nதன்வா வாசா தியா வா பஜதி பத ஜநஃ க்ஷுத்ரதைவ ஸ்புடேயம் ।",
        telugu: "ఏవం దుర్లభ్యవస్తున్యపి సులభతయా హస్తలబ్ధే యదన్యత్\nతన్వా వాచా ధియా వా భజతి బత జనః క్షుద్రతైవ స్ఫుటేయమ్ ।",
        malayalam: "ഏവം ദുർലഭ്യവസ്തുന്യപി സുലഭതയാ ഹസ്തലബ്ധേ യദന്യത്\nതന്വാ വാചാ ധിയാ വാ ഭജതി ബത ജനഃ ക്ഷുദ്രതൈവ സ്ഫുടേയമ് ।",
        meaning_english: "When such a rare treasure is easily available at hand, people still worship other things through body, speech, and mind — how clearly this reveals their pettiness! Let us, with a firm mind, worship the Lord of Guruvayur ceaselessly for the removal of all worldly suffering.",
        meaning_tamil: "அவ்வாறு அரிதான பொருள் எளிதில் கிடைக்கும்போதும், மக்கள் மற்ற பொருட்களை வணங்குகிறார்கள்.",
        meaning_telugu: "అంత అరుదైన వస్తువు సులభంగా అందుబాటులో ఉన్నప్పటికీ, ప్రజలు ఇతర వస్తువులను ఆరాధిస్తారు.",
        meaning_malayalam: "അത്തരം അപൂർവ വസ്തു എളുപ്പത്തിൽ ലഭ്യമാണെങ്കിലും, ജനങ്ങൾ മറ്റ് വസ്തുക്കളെ ആരാധിക്കുന്നു.",
        meter: "Sragdharā",
      },
      {
        id: "1-3",
        dashakam: 1,
        paragraph: 3,
        sanskrit: "सत्त्वं यत्तत्पुराणाः परमिह गुणतो जीवहेतुत्रयाणां\nताभ्यामन्यद्विशुद्धं तव तु गुणमयं मायया कल्पितं त्रि ।",
        english: "Sattvam yattattapuraanaah paramihaa gunatoh jeevhahetutrayaanaam\nTaabhyaamanyadvishuddhaam tava tu gunamayam maayayaa kalpitam tri |",
        tamil: "ஸத்வம் யத்தத்புராணாஃ பரமிஹ குணதோ ஜீவஹேதுத்ரயாணாம்\nதாப்யாமன்யத்விசுத்தம் தவ து குணமயம் மாயயா கல்பிதம் த்ரி ।",
        telugu: "సత్త్వం యత్తత్పురాణాః పరమిహ గుణతో జీవహేతుత్రయాణాం\nతాభ్యామన్యద్విశుద్ధం తవ తు గుణమయం మాయయా కల్పితం త్రి ।",
        malayalam: "സത്ത്വം യത്തത്പുരാണാഃ പരമിഹ ഗുണതോ ജീവഹേതുത്രയാണാം\nതാഭ്യാമന്യദ്വിശുദ്ധം തവ തു ഗുണമയം മാശയാ കൽപിതം ത്രി ।",
        meaning_english: "The ancients declare that Sattva is the highest among the three qualities that cause individual existence. Your quality, different from the other two, is pure. The three qualities are created by Maya.",
        meaning_tamil: "பண்டைய முனிவர்கள் சத்வம் மூன்று குணங்களில் உயர்ந்தது என்று அறிவிக்கின்றனர்.",
        meaning_telugu: "ప్రాచీనులు సత్త్వం మూడు గుణాలలో ఉన్నతమైనదని ప్రకటిస్తారు.",
        meaning_malayalam: "പുരാതനർ സത്ത്വം മൂന്ന് ഗുണങ്ങളിൽ ഏറ്റവും ഉന്നതമെന്ന് പ്രഖ്യാപിക്കുന്നു.",
        meter: "Sragdharā",
      },
    ],
  },
  {
    id: 2,
    title_sanskrit: "भगवदवतारवर्णनम्",
    title_english: "Bhagavad Avatara Varnanam — Description of Divine Incarnations",
    description: "Narration of the various avatars of Lord Vishnu",
    verses: [],
  },
  {
    id: 3,
    title_sanskrit: "वराहावतारः",
    title_english: "Varahaavataarah — The Boar Incarnation",
    description: "The story of Lord Varaha lifting the Earth",
    verses: [],
  },
];

// Total structure: 100 Dashakams, ~1034 verses
export const TOTAL_DASHAKAMS = 100;
export const TOTAL_VERSES = 1034;
