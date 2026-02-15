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
  title_transliteration: string;
  description: string;
  gist: string;
  benefits: string;
  meter: number;
  num_verses: number;
  bell_verses: number[];
  prasadam_info: { verse: number; item: string }[];
  remarks?: string;
  verses: Verse[];
  imageUrl?: string;
}

export type TransliterationLanguage = "sanskrit" | "english" | "tamil" | "malayalam";
export type TranslationLanguage = "english" | "tamil" | "malayalam" | "telugu";
export type Language = "sanskrit" | "english" | "tamil" | "telugu" | "malayalam";

export const TRANSLITERATION_LANGUAGES: { value: TransliterationLanguage; label: string }[] = [
  { value: "sanskrit", label: "Sanskrit (Devanagari)" },
  { value: "english", label: "English" },
  { value: "tamil", label: "Tamil" },
  { value: "malayalam", label: "Malayalam" },
];

export const TRANSLATION_LANGUAGES: { value: TranslationLanguage; label: string }[] = [
  { value: "english", label: "English" },
  { value: "tamil", label: "Tamil" },
  { value: "malayalam", label: "Malayalam" },
  { value: "telugu", label: "Telugu" },
];

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: "sanskrit", label: "Sanskrit" },
  { value: "english", label: "English" },
  { value: "tamil", label: "Tamil" },
  { value: "telugu", label: "Telugu" },
  { value: "malayalam", label: "Malayalam" },
];

function parsePrasadamInfo(raw: string): { verse: number; item: string }[] {
  if (!raw) return [];
  return raw.split(";").map((s) => {
    const parts = s.trim().split("-");
    return { verse: parseInt(parts[0]), item: parts.slice(1).join("-").trim() };
  }).filter((p) => !isNaN(p.verse));
}

function parseBellVerses(raw: string): number[] {
  if (!raw) return [];
  return raw.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
}

// Helper: check if a verse should show bell icon
export function verseShouldShowBell(dashakam: Dashakam, verseNumber: number): boolean {
  return dashakam.bell_verses.includes(verseNumber);
}

// Helper: get prasadam for a verse
export function getVersePrasadam(dashakam: Dashakam, verseNumber: number): string | undefined {
  const info = dashakam.prasadam_info.find((p) => p.verse === verseNumber);
  return info?.item;
}

// All 100 Dashakams with metadata from SN_DB
export const sampleDashakams: Dashakam[] = [
  {
    id: 1, title_sanskrit: "भगवतः स्वरूपं तथा माहात्म्यम्", title_english: "Glory of the Lord",
    title_transliteration: "bhagavataḥ svarūpaṁ tathā māhātmyam", gist: "Description of the formless and form aspects of the Lord.",
    benefits: "Attainment of devotion and removal of obstacles.", meter: 1, num_verses: 10,
    description: "Description of the divine form of Lord Narayana at Guruvayur",
    bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }],
    verses: [
      {
        id: "1-1", dashakam: 1, paragraph: 1,
        sanskrit: "सान्द्रानन्दावबोधात्मकमनुपमितं कालदेशावधिभ्यां\nनिर्मुक्तं नित्यमुक्तं निगमशतसहस्रेण निर्भास्यमानम् ।\nअस्पष्टं दृष्टमात्रे पुनरुरुपुरुषार्थात्मकं ब्रह्म तत्त्वं\nतत्तावद्भाति साक्षाद्गुरुपवनपुरे हन्त भाग्यं जनानाम् ॥",
        english: "Saandraanandaavabodhaatmakam anupamitam kaaladeshaavadhibhyaam\nNirmuktam nityamuktam nigamashatasahasrena nirbhaasyamaanam |\nAspastam drushtamaatre punarurupurushaartatmakam brahma tattvam\nTattaavadbhaati saakshaad gurupavanupure hanta bhaagyam janaanaam ||",
        tamil: "சாந்த்ராநந்தாவபோதாத்மகமநுபமிதம் காலதேசாவதிப்யாம்\nநிர்முக்தம் நித்யமுக்தம் நிகமசதஸஹஸ்ரேண நிர்பாஸ்யமானம் ।\nஅஸ்பஷ்டம் த்ருஷ்டமாத்ரே புநருருபுருஷார்தாத்மகம் ப்ரஹ்ம தத்வம்\nதத்தாவத்பாதி ஸாக்ஷாத்குருபவநபுரே ஹந்த பாக்யம் ஜநாநாம் ॥",
        telugu: "సాంద్రానందావబోధాత్మకమనుపమితం కాలదేశావధిభ్యాం\nనిర్ముక్తం నిత్యముక్తం నిగమశతసహస్రేణ నిర్భాస్యమానమ్ ।\nఅస్పష్టం దృష్టమాత్రే పునరురుపురుషార్థాత్మకం బ్రహ్మ తత్త్వం\nతత్తావద్భాతి సాక్షాద్గురుపవనపురే హన్త భాగ్యం జనానామ్ ॥",
        malayalam: "സാന്ദ്രാനന്ദാവബോധാത്മകമനുപമിതം കാലദേശാവധിഭ്യാം\nനിർമുക്തം നിത്യമുക്തം നിഗമശതസഹസ്രേണ നിർഭാസ്യമാനം ।\nഅസ്പഷ്ടം ദൃഷ്ടമാത്രേ പുനരുരുപുരുഷാർഥാത്മകം ബ്രഹ്മ തത്ത്വം\nതത്താവദ്ഭാതി സാക്ഷാദ്ഗുരുപവനപുരേ ഹന്ത ഭാഗ്യം ജനാനാം ॥",
        meaning_english: "That Brahman — the essence of intense bliss and consciousness, incomparable, free from the limitations of time and space, eternally liberated, illuminated by hundreds of thousands of Vedas, not clearly perceived by mere sight, yet the very embodiment of the supreme goal of life — that Reality shines directly in Guruvayur. Oh, the fortune of the people!",
        meaning_tamil: "அந்த பிரம்மம் — தீவிர ஆனந்தம் மற்றும் உணர்வின் சாரம், ஒப்பிடமுடியாதது, காலம் மற்றும் இடத்தின் வரம்புகளிலிருந்து விடுபட்டது — அந்த உண்மை குருவாயூரில் நேரடியாக ஒளிர்கிறது.",
        meaning_telugu: "ఆ బ్రహ్మము — తీవ్ర ఆనందం మరియు చైతన్యం యొక్క సారాంశం — ఆ వాస్తవం గురువాయూరులో ప్రత్యక్షంగా ప్రకాశిస్తుంది.",
        meaning_malayalam: "ആ ബ്രഹ്മം — തീവ്ര ആനന്ദത്തിന്റെയും ബോധത്തിന്റെയും സാരാംശം — ഗുരുവായൂരിൽ നേരിട്ട് പ്രകാശിക്കുന്നു.",
        meter: "Sragdharā", prasadam: "Any fruit or water", bell: true,
      },
      {
        id: "1-2", dashakam: 1, paragraph: 2,
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
        id: "1-3", dashakam: 1, paragraph: 3,
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
  { id: 2, title_sanskrit: "भगवतः स्वरूपमाधुर्यं तथा भक्तिमहत्त्वम्", title_english: "Sweetness of the Lord's form", title_transliteration: "bhagavataḥ svarūpamādhuryam tathā bhaktimahattvam", gist: "The sweetness of the Lord's form and superiority of Bhakti.", benefits: "Mental peace and purity of thought.", meter: 1, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 3, title_sanskrit: "उत्तमभक्तस्य गुणाः", title_english: "Qualities of an ideal devotee", title_transliteration: "uttamabhaktasya guṇāḥ", gist: "Characteristics of a true devotee.", benefits: "Developing dispassion and focus in prayer.", meter: 1, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 4, title_sanskrit: "योगाभ्यासः तथा योगसिद्धिः", title_english: "Practice of Ashtanga Yoga", title_transliteration: "yogābhyāsaḥ tathā yogasiddhiḥ", gist: "The practice of Yoga and control of breath.", benefits: "Physical health and steady mind.", meter: 4, num_verses: 13, description: "", bell_verses: [13], prasadam_info: [{ verse: 13, item: "Any fruit or water" }], verses: [] },
  { id: 5, title_sanskrit: "विराट्पुरुषोत्पत्तिः", title_english: "Manifestation of the Cosmic Form", title_transliteration: "virāṭpuruṣotpattiḥ", gist: "The manifestation of the Cosmic Form.", benefits: "Knowledge of the universe's origin.", meter: 1, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 6, title_sanskrit: "विराट्स्वरूपवर्णनम्", title_english: "Description of the Cosmic Form", title_transliteration: "virāṭsvarūpavarṇanam", gist: "Detailed description of the Cosmic Body.", benefits: "Freedom from fear of the unknown.", meter: 6, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 7, title_sanskrit: "सृष्टिक्रमम्", title_english: "The Process of Creation", title_transliteration: "sṛṣṭikramam", gist: "The systematic process of creation.", benefits: "Success in new ventures.", meter: 1, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 8, title_sanskrit: "प्रलयवर्णनम्", title_english: "Description of the Deluge", title_transliteration: "pralayavarṇanam", gist: "The description of the great deluge.", benefits: "Protection during times of chaos.", meter: 6, num_verses: 13, description: "", bell_verses: [13], prasadam_info: [{ verse: 13, item: "Any fruit or water" }], verses: [] },
  { id: 9, title_sanskrit: "ब्रह्मणः तपः तथा लोकसृष्टिः", title_english: "Penance of Brahma & World Creation", title_transliteration: "brahmaṇaḥ tapaḥ tathā lokasṛṣṭiḥ", gist: "Brahma's penance and the start of creation.", benefits: "Clarity of purpose and wisdom.", meter: 9, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 10, title_sanskrit: "सृष्टिवैविध्यम्", title_english: "Variety in Creation", title_transliteration: "sṛṣṭivaividhyam", gist: "The variety of species and worlds created.", benefits: "Harmonious living with nature.", meter: 6, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 11, title_sanskrit: "सनकादीनां वैकुण्ठदर्शनम्", title_english: "Vision of Vaikuntha by Sanaka sages", title_transliteration: "sanakādīnāṁ vaikuṇṭhadarśanam", gist: "Sages visit Vaikuntha; the fall of Jaya/Vijaya.", benefits: "Entry into spiritual realms; humility.", meter: 6, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 12, title_sanskrit: "वराहावतारम्", title_english: "The Boar Incarnation", title_transliteration: "varāhāvatāram", gist: "The incarnation of the Lord as a Boar.", benefits: "Recovery of lost property or status.", meter: 6, num_verses: 10, description: "", bell_verses: [3, 10], prasadam_info: [{ verse: 3, item: "Any fruit or water" }, { verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 13, title_sanskrit: "हिरण्याक्षवध", title_english: "Killing of Hiranyaksha", title_transliteration: "hiraṇyākṣavadha", gist: "The battle and killing of the demon Hiranyaksha.", benefits: "Victory over powerful enemies.", meter: 3, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 14, title_sanskrit: "कपिलावतारम्", title_english: "The Incarnation as Kapila", title_transliteration: "kapilāvatāram", gist: "Birth of Lord Kapila, the teacher of Sankhya.", benefits: "Gaining a good teacher/mentor.", meter: 4, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 15, title_sanskrit: "कपिलोपदेशम्", title_english: "Teachings of Kapila", title_transliteration: "kapilopadeśam", gist: "Kapila's philosophical teachings to his mother.", benefits: "Spiritual enlightenment and self-realization.", meter: 9, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 16, title_sanskrit: "नारायणस्य अवतारम्", title_english: "Incarnation of Narayana (Nara-Narayana)", title_transliteration: "nārāyaṇasya avatāram", gist: "Nara-Narayana and other early incarnations.", benefits: "Destruction of pride and lust.", meter: 6, num_verses: 10, description: "", bell_verses: [2, 10], prasadam_info: [{ verse: 2, item: "Any fruit or water" }, { verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 17, title_sanskrit: "ध्रुवचरितम्", title_english: "Story of Dhruva", title_transliteration: "dhruvacaritam", gist: "The story of the child devotee Dhruva.", benefits: "Achieving a stable and high position in life.", meter: 6, num_verses: 11, description: "", bell_verses: [7, 11], prasadam_info: [{ verse: 7, item: "Any fruit or water" }, { verse: 11, item: "Any fruit or water" }], verses: [] },
  { id: 18, title_sanskrit: "पृथुचरितम्", title_english: "Story of King Prithu", title_transliteration: "pṛthucaritam", gist: "The story of King Prithu milking the Earth.", benefits: "Prosperity and abundance of food/resources.", meter: 6, num_verses: 10, description: "", bell_verses: [4, 10], prasadam_info: [{ verse: 4, item: "Any fruit or water" }, { verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 19, title_sanskrit: "प्रचेतसः कथा", title_english: "Story of the Prachetas", title_transliteration: "pracetasaḥ kathā", gist: "The story of the Prachetas and their penance.", benefits: "Unity among family and siblings.", meter: 6, num_verses: 10, description: "", bell_verses: [3, 10], prasadam_info: [{ verse: 3, item: "Any fruit or water" }, { verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 20, title_sanskrit: "ऋषभचरितम्", title_english: "Story of Rishabha Deva", title_transliteration: "ṛṣabhacaritam", gist: "Life of Rishabha Deva, the ascetic King.", benefits: "Freedom from worldly attachments.", meter: 6, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 21, title_sanskrit: "भरतचरितम्", title_english: "Story of King Bharata", title_transliteration: "bharatacaritam", gist: "King Bharata's life and his rebirth as a deer.", benefits: "Caution against attachment; focus on goal.", meter: 6, num_verses: 12, description: "", bell_verses: [12], prasadam_info: [{ verse: 12, item: "Any fruit or water" }], verses: [] },
  { id: 22, title_sanskrit: "अजामिलोपाख्यानम्", title_english: "Legend of Ajamila", title_transliteration: "ajāmilopākhyānam", gist: "Salvation of the sinner Ajamila by chanting.", benefits: "Removal of the fear of death (Yama).", meter: 6, num_verses: 11, description: "", bell_verses: [11], prasadam_info: [{ verse: 11, item: "Any fruit or water" }], verses: [] },
  { id: 23, title_sanskrit: "दक्ष-चित्रकेतु चरितम्", title_english: "Story of Daksha & Chitraketu", title_transliteration: "dakṣa-citraketu caritam", gist: "Stories of Daksha and King Chitraketu.", benefits: "Solace during the loss of children/loved ones.", meter: 6, num_verses: 11, description: "", bell_verses: [11], prasadam_info: [{ verse: 11, item: "Any fruit or water" }], verses: [] },
  { id: 24, title_sanskrit: "प्रह्लादचरितम्", title_english: "Story of Prahlada", title_transliteration: "prahlādacaritam", gist: "The devotion of Prahlada amidst torture.", benefits: "Protection from family-related troubles.", meter: 3, num_verses: 10, description: "", remarks: "Don't say Sri Hare Namaha", bell_verses: [3, 10], prasadam_info: [{ verse: 3, item: "Any fruit or water" }, { verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 25, title_sanskrit: "नरसिंहावतारम्", title_english: "Incarnation of Narasimha", title_transliteration: "narasiṁhāvatāram", gist: "Lord Narasimha emerges from the pillar.", benefits: "Instant protection from extreme danger.", meter: 1, num_verses: 10, description: "", remarks: "Repeat last 2 lines twice", bell_verses: [1, 4, 10], prasadam_info: [{ verse: 1, item: "Any fruit or water" }, { verse: 4, item: "Paanagam" }, { verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 26, title_sanskrit: "गजेन्द्रमोक्षम्", title_english: "Salvation of Gajendra", title_transliteration: "gajendramokṣam", gist: "The Lord saves the elephant from the crocodile.", benefits: "Freedom from bondage and chronic debts.", meter: 6, num_verses: 10, description: "", remarks: "End Sri Akhila Guru Bhagawaan Namaste", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Lotus" }], verses: [] },
  { id: 27, title_sanskrit: "क्षीराब्धिमथनं तथा कूर्मावतारम्", title_english: "Churning of Ocean & Tortoise Avatar", title_transliteration: "kṣīrābdhimathanaṁ tathā kūrmāvatāram", gist: "Churning the ocean and the Tortoise Avatar.", benefits: "Gaining patience and endurance.", meter: 4, num_verses: 11, description: "", bell_verses: [6, 11], prasadam_info: [{ verse: 6, item: "Any fruit or water" }, { verse: 11, item: "Any fruit or water" }], verses: [] },
  { id: 28, title_sanskrit: "लक्ष्मीस्वयंवरं तथा अमृतोत्पत्तिः", title_english: "Marriage of Lakshmi & Birth of Amrita", title_transliteration: "lakṣmīsvayaṁvaraṁ tathā amṛtotpattiḥ", gist: "Lakshmi emerges; the birth of Amrita.", benefits: "Wealth, beauty, and good fortune.", meter: 4, num_verses: 10, description: "", remarks: "Last slokam for health", bell_verses: [3, 10], prasadam_info: [{ verse: 3, item: "Any fruit or water" }, { verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 29, title_sanskrit: "मोहिन्यवतारं आदि", title_english: "Mohini Avatar & others", title_transliteration: "mohinyavatāraṁ ādi", gist: "The Lord as Mohini; killing of demons.", benefits: "Protection from deception and evil eye.", meter: 6, num_verses: 10, description: "", remarks: "End - Swamiye Saranam Ayappa", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 30, title_sanskrit: "वामनावतारम्", title_english: "Vamana Incarnation", title_transliteration: "vāmanāvatāram", gist: "The Vamana (dwarf) incarnation.", benefits: "Humility and success in charity.", meter: 6, num_verses: 10, description: "", bell_verses: [4, 10], prasadam_info: [{ verse: 4, item: "Any fruit or water" }, { verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 31, title_sanskrit: "बलिदर्पहरणम्", title_english: "Humbling of Bali's Pride", title_transliteration: "balidarpaharaṇam", gist: "Humbling King Bali; Lord measuring the worlds.", benefits: "Regaining lost land and positions.", meter: 3, num_verses: 10, description: "", bell_verses: [6, 10], prasadam_info: [{ verse: 6, item: "Any fruit or water" }, { verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 32, title_sanskrit: "मत्स्यावतारम्", title_english: "Matsya (Fish) Incarnation", title_transliteration: "matsyāvatāram", gist: "The Lord as a Fish saving the Vedas.", benefits: "Protection during travels, especially by water.", meter: 6, num_verses: 10, description: "", bell_verses: [2, 10], prasadam_info: [{ verse: 2, item: "Any fruit or water" }, { verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 33, title_sanskrit: "अम्बरीष चरितम्", title_english: "Story of King Ambarisha", title_transliteration: "ambarīṣa caritam", gist: "The story of King Ambarisha and the Sudarshana.", benefits: "Protection from the curses of others.", meter: 6, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 34, title_sanskrit: "श्रीरामावतारम्", title_english: "Incarnation of Sri Rama (Part 1)", title_transliteration: "śrīrāmāvatāram", gist: "Birth of Rama and his forest exile.", benefits: "Success in following the path of truth.", meter: 1, num_verses: 10, description: "", remarks: "No Sri Hare Namaha", bell_verses: [1, 3, 6, 10], prasadam_info: [{ verse: 1, item: "Any fruit or water" }, { verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 35, title_sanskrit: "श्रीरामावतारं (उत्तरार्ध)", title_english: "Incarnation of Sri Rama (Part 2)", title_transliteration: "śrīrāmāvatāram (uttarārdha)", gist: "War with Ravana and Rama's coronation.", benefits: "Victory in legal battles and wars.", meter: 1, num_verses: 10, description: "", remarks: "3,7 - repeat last 2 lines thrice", bell_verses: [3, 7, 10], prasadam_info: [{ verse: 3, item: "Paal payasam" }, { verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 36, title_sanskrit: "परशुरामावतारम्", title_english: "Parasurama Incarnation", title_transliteration: "paraśurāmāvatāram", gist: "The Brahmin warrior Parasurama.", benefits: "Destruction of negative ego and arrogance.", meter: 1, num_verses: 10, description: "", bell_verses: [2, 10], prasadam_info: [{ verse: 2, item: "Any fruit or water" }, { verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 37, title_sanskrit: "श्रीकृष्णस्य अवतारम्", title_english: "Birth of Lord Krishna", title_transliteration: "śrīkṛṣṇasya avatāram", gist: "The birth of Krishna in the prison.", benefits: "Relief for those in bondage or prison.", meter: 1, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 38, title_sanskrit: "श्रीकृष्णप्रादुर्भावः", title_english: "Arrival of Krishna at Gokula", title_transliteration: "śrīkṛṣṇaprādurbhāvaḥ", gist: "Arrival in Gokula and exchange of babies.", benefits: "Safety of newborn children.", meter: 6, num_verses: 10, description: "", bell_verses: [2, 10], prasadam_info: [{ verse: 2, item: "Vara daanam" }, { verse: 10, item: "Butter" }], verses: [] },
  { id: 39, title_sanskrit: "उत्सवमहोत्सवः", title_english: "Celebration in Gokula", title_transliteration: "utsavamahotsavaḥ", gist: "The joy of Nanda and the Gopis.", benefits: "General happiness and festive spirits.", meter: 39, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 40, title_sanskrit: "पूतनावधः", title_english: "Killing of Putana", title_transliteration: "pūtanāvadhaḥ", gist: "Killing of the demoness Putana.", benefits: "Protection of children from illness.", meter: 40, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 41, title_sanskrit: "पूतनासंस्कारम्", title_english: "Cremation of Putana", title_transliteration: "pūtanāsaṁskāram", gist: "The transformation of Putana's body.", benefits: "Purification of the soul.", meter: 6, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 42, title_sanskrit: "शकटासुरवधः", title_english: "Killing of Sakatasura", title_transliteration: "śakaṭāsuravadhaḥ", gist: "Destruction of the cart demon.", benefits: "Removal of obstacles to growth.", meter: 6, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 43, title_sanskrit: "तृणावर्तवधः", title_english: "Killing of Trinavarta", title_transliteration: "tṛṇāvartavadhaḥ", gist: "Destruction of the whirlwind demon.", benefits: "Protection from natural disasters.", meter: 6, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 44, title_sanskrit: "नामकरणम्", title_english: "Naming Ceremony of Krishna", title_transliteration: "nāmakaraṇam", gist: "Naming ceremony by Garga Muni.", benefits: "Wisdom and good reputation for children.", meter: 1, num_verses: 10, description: "", bell_verses: [5, 10], prasadam_info: [{ verse: 5, item: "Sweet" }, { verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 45, title_sanskrit: "बाललीला", title_english: "Childhood Sports of Krishna", title_transliteration: "bālalīlā", gist: "The crawling and childhood plays of Krishna.", benefits: "Joy of parenthood; cure for childlessness.", meter: 4, num_verses: 11, description: "", bell_verses: [11], prasadam_info: [{ verse: 11, item: "Any fruit or water" }], verses: [] },
  { id: 46, title_sanskrit: "विश्वरूपदर्शनम्", title_english: "Vision of Universe in Krishna's Mouth", title_transliteration: "viśvarūpadarśanam", gist: "Yashoda sees the universe in Krishna's mouth.", benefits: "Understanding the divine in the mundane.", meter: 4, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 47, title_sanskrit: "उलूखलबन्धनम्", title_english: "Being tied to the Mortar", title_transliteration: "ulūkhalabandhanam", gist: "Being tied to the mortar by Yashoda.", benefits: "Attainment of pure, unselfish love.", meter: 4, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 48, title_sanskrit: "नलकूबर-मणिग्रीव शापमोक्षः", title_english: "Liberation of Nalakuvara & Manigriva", title_transliteration: "nalakūbara-maṇigrīva śāpamokṣaḥ", gist: "Liberating the sons of Kubera from tree form.", benefits: "Relief from curses and ancestral debts.", meter: 6, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 49, title_sanskrit: "वृन्दावनप्रवेशम्", title_english: "Entering Vrindavan", title_transliteration: "vṛndāvanapraveśam", gist: "Moving from Gokula to Vrindavan.", benefits: "Success in changing homes or locations.", meter: 6, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 50, title_sanskrit: "वत्स-बकासुरवधः", title_english: "Killing of Vatsasura & Bakasura", title_transliteration: "vatsa-bakāsuravadhaḥ", gist: "Killing the calf and crane demons.", benefits: "Freedom from deceitful friends.", meter: 9, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Curd rice" }], verses: [] },
  { id: 51, title_sanskrit: "अघासुरवधः", title_english: "Killing of Aghasura", title_transliteration: "aghāsuravadhaḥ", gist: "Destruction of the python demon.", benefits: "Removal of deep-seated sins.", meter: 6, num_verses: 10, description: "", bell_verses: [6, 10], prasadam_info: [{ verse: 6, item: "Any fruit or water" }, { verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 52, title_sanskrit: "ब्रह्मगर्वशमनम्", title_english: "Humbling of Brahma's Pride", title_transliteration: "brahmagarvaśamanam", gist: "Brahma hides the calves; Krishna multiplies.", benefits: "Removal of intellectual pride.", meter: 6, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 53, title_sanskrit: "धेनुकासुरवधः", title_english: "Killing of Dhenukasura", title_transliteration: "dhenukāsuravadhaḥ", gist: "Balarama kills the donkey demon.", benefits: "Removal of laziness and ignorance.", meter: 6, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 54, title_sanskrit: "कालियसर्पस्य आगमनम्", title_english: "Arrival of Kaliya Serpent", title_transliteration: "kāliyasarpasya āgamanam", gist: "Discovery of the poisonous Kaliya lake.", benefits: "Warning against hidden dangers.", meter: 1, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 55, title_sanskrit: "कालियनर्तनम्", title_english: "Krishna's Dance on Kaliya", title_transliteration: "kāliyanartanam", gist: "Krishna dancing on the hoods of the snake.", benefits: "Protection from snake bites and toxins.", meter: 55, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 56, title_sanskrit: "कालियगर्वशमनम्", title_english: "Humbling of Kaliya's Pride", title_transliteration: "kāliyagarvaśamanam", gist: "Pardoning Kaliya and sending him away.", benefits: "Turning enemies into friends.", meter: 40, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 57, title_sanskrit: "प्रलम्बासुरवधः", title_english: "Killing of Pralambasura", title_transliteration: "pralambāsuravadhaḥ", gist: "Balarama kills Pralamba.", benefits: "Destruction of heavy mental burdens.", meter: 1, num_verses: 11, description: "", bell_verses: [11], prasadam_info: [{ verse: 11, item: "Any fruit or water" }], verses: [] },
  { id: 58, title_sanskrit: "दावाग्निमोक्षम्", title_english: "Saving from the Forest Fire", title_transliteration: "dāvāgnimokṣam", gist: "Krishna swallows the forest fire.", benefits: "Protection from fire accidents.", meter: 9, num_verses: 10, description: "", remarks: "Repeat last line thrice", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 59, title_sanskrit: "वेणुगानम्", title_english: "The Divine Flute Music", title_transliteration: "veṇugānam", gist: "The magic of Krishna's flute.", benefits: "Mental peace and artistic inspiration.", meter: 4, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 60, title_sanskrit: "गोपीवस्त्रापहारम्", title_english: "Stealing the Clothes of Gopis", title_transliteration: "gopīvastrāpahāram", gist: "Stealing the clothes of the Gopis.", benefits: "Surrender of the ego before God.", meter: 4, num_verses: 11, description: "", bell_verses: [8, 11], prasadam_info: [{ verse: 8, item: "Any fruit or water" }, { verse: 11, item: "Any fruit or water" }], verses: [] },
  { id: 61, title_sanskrit: "यज्ञपत्न्यनुग्रहम्", title_english: "Blessing the Wives of Sacrificers", title_transliteration: "yajñapatnyanugraham", gist: "Blessing the wives of the Brahmins.", benefits: "Acceptance of simple, sincere devotion.", meter: 6, num_verses: 10, description: "", bell_verses: [7, 10], prasadam_info: [{ verse: 7, item: "Any fruit or water" }, { verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 62, title_sanskrit: "इन्द्रयागप्रतिषेधः", title_english: "Prohibition of Indra-Yaga", title_transliteration: "indrayāgapratiṣedhaḥ", gist: "Stopping the sacrifice to Indra.", benefits: "Freedom from superstitious fears.", meter: 3, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 63, title_sanskrit: "गोवर्धनोद्धारणम्", title_english: "Lifting of Govardhana Hill", title_transliteration: "govardhanoddharaṇam", gist: "Lifting the mountain with a finger.", benefits: "Divine protection during crisis.", meter: 1, num_verses: 10, description: "", bell_verses: [3, 10], prasadam_info: [{ verse: 3, item: "Vadai" }, { verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 64, title_sanskrit: "गोवर्धनाभिषेकः", title_english: "Coronation of Krishna as Govinda", title_transliteration: "govardhanābhiṣekaḥ", gist: "Indra's apology and Krishna's coronation.", benefits: "Relief from the anger of superiors.", meter: 6, num_verses: 10, description: "", bell_verses: [4, 5, 10], prasadam_info: [{ verse: 4, item: "Some sweet" }, { verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 65, title_sanskrit: "अनिरुद्धदूत-प्रचार", title_english: "Gopis' search for Krishna", title_transliteration: "aniruddhadūta-pracāra", gist: "Gopis searching for Krishna.", benefits: "Intense longing for the divine.", meter: 6, num_verses: 9, description: "", bell_verses: [9], prasadam_info: [{ verse: 9, item: "Any fruit or water" }], verses: [] },
  { id: 66, title_sanskrit: "गोपीजनाह्लादनम्", title_english: "Delighting the Gopis", title_transliteration: "gopījanāhlādanam", gist: "Krishna returning to the Gopis.", benefits: "Meeting separated loved ones.", meter: 4, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 67, title_sanskrit: "श्रीकृष्णप्रकटदर्शनम्", title_english: "Reappearance of Krishna to Gopis", title_transliteration: "śrīkṛṣṇaprakaṭadarśanam", gist: "The Lord appearing to the devotees.", benefits: "Direct vision/experience of the divine.", meter: 6, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 68, title_sanskrit: "गोपिकानां आह्लादः", title_english: "Joy of the Gopis", title_transliteration: "gopikānāṁ āhlādaḥ", gist: "Conversation between Gopis and Krishna.", benefits: "Emotional healing and comfort.", meter: 68, num_verses: 10, description: "", remarks: "Not to say Sri Hare Namaha at end - repeat last line thrice", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 69, title_sanskrit: "रासक्रीडा", title_english: "The Divine Rasa Dance", title_transliteration: "rāsakrīḍā", gist: "The divine dance of union.", benefits: "Marital harmony and bliss.", meter: 69, num_verses: 11, description: "", remarks: "Repeat last 2 lines thrice", bell_verses: [11], prasadam_info: [{ verse: 11, item: "Shundal" }], verses: [] },
  { id: 70, title_sanskrit: "सुदर्शनशापमोक्षः", title_english: "Liberation of Sudarshana", title_transliteration: "sudarśanaśāpamokṣaḥ", gist: "Saving Nanda from the python.", benefits: "Salvation of elders in the family.", meter: 1, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 71, title_sanskrit: "केशी-व्योमासुरवधः", title_english: "Killing of Keshi & Vyomasura", title_transliteration: "keśī-vyomāsuravadhaḥ", gist: "Killing the horse and sky demons.", benefits: "Removal of pride and mental agitation.", meter: 6, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 72, title_sanskrit: "अक्रूरगोकुलयात्रा", title_english: "Akrura's Journey to Gokula", title_transliteration: "akrūragokulayātrā", gist: "Akrura's travel to meet Krishna.", benefits: "Success in sacred pilgrimages.", meter: 6, num_verses: 12, description: "", bell_verses: [12], prasadam_info: [{ verse: 12, item: "Any fruit or water" }], verses: [] },
  { id: 73, title_sanskrit: "अक्रूरमथुरागमनम्", title_english: "Akrura's Return to Mathura", title_transliteration: "akrūramathurāgamanam", gist: "Journey to Mathura; vision in the water.", benefits: "Fulfillment of long-held desires.", meter: 4, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 74, title_sanskrit: "मथुराप्रवेशम्", title_english: "Entering Mathura", title_transliteration: "mathurāpraveśam", gist: "Entering the city; blessing the washerman.", benefits: "Good social standing and popularity.", meter: 1, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 75, title_sanskrit: "कंसवधः", title_english: "Killing of Kamsa", title_transliteration: "kaṁsavadhaḥ", gist: "The wrestling match and death of Kamsa.", benefits: "Destruction of formidable rivals.", meter: 1, num_verses: 10, description: "", bell_verses: [9, 10], prasadam_info: [{ verse: 9, item: "Any fruit or water" }, { verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 76, title_sanskrit: "उद्धवदूतम्", title_english: "Uddhava as Messenger", title_transliteration: "uddhavadūtam", gist: "Uddhava carries Krishna's message.", benefits: "Solace during separation.", meter: 3, num_verses: 11, description: "", bell_verses: [11], prasadam_info: [{ verse: 11, item: "Any fruit or water" }], verses: [] },
  { id: 77, title_sanskrit: "कुब्जानुग्रहम्", title_english: "Blessing of Kubja", title_transliteration: "kubjānugraham", gist: "Straightening the hunchbacked woman.", benefits: "Cure for physical deformities/disabilities.", meter: 1, num_verses: 12, description: "", bell_verses: [12], prasadam_info: [{ verse: 12, item: "Any fruit or water" }], verses: [] },
  { id: 78, title_sanskrit: "द्वारकावासः", title_english: "Staying in Dwarka", title_transliteration: "dvārakāvāsaḥ", gist: "Building and living in Dwarka.", benefits: "Building a new house or stable life.", meter: 40, num_verses: 10, description: "", bell_verses: [2, 10], prasadam_info: [{ verse: 2, item: "Sakkarai Pongal" }, { verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 79, title_sanskrit: "स्यमन्तकोपाख्यानम्", title_english: "Legend of Syamantaka Gem", title_transliteration: "syamantakopākhyānam", gist: "The story of the stolen gem.", benefits: "Clearing oneself of false accusations.", meter: 40, num_verses: 12, description: "", remarks: "End - 8 times Narayana", bell_verses: [12], prasadam_info: [{ verse: 12, item: "Paruppu thengai, bakshanam etc for marriage" }], verses: [] },
  { id: 80, title_sanskrit: "रुक्मिणीस्वयंवरम्", title_english: "Marriage with Rukmini", title_transliteration: "rukmiṇīsvayaṁvaram", gist: "Abduction and marriage of Rukmini.", benefits: "Timely marriage and suitable partners.", meter: 1, num_verses: 11, description: "", bell_verses: [5, 11], prasadam_info: [{ verse: 5, item: "Any fruit or water" }, { verse: 11, item: "Any fruit or water" }], verses: [] },
  { id: 81, title_sanskrit: "नरकासुरवधः", title_english: "Killing of Narakasura", title_transliteration: "narakāsuravadhaḥ", gist: "Killing Narakasura and freeing captives.", benefits: "Release from any form of captivity.", meter: 3, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 82, title_sanskrit: "बाणासुरयुद्धम्", title_english: "Battle with Banasura", title_transliteration: "bāṇāsurayuddham", gist: "Fight with Banasura and Lord Shiva.", benefits: "Reconciliation between different faiths.", meter: 1, num_verses: 10, description: "", bell_verses: [3, 10], prasadam_info: [{ verse: 3, item: "Any fruit or water" }, { verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 83, title_sanskrit: "पौण्ड्रकवधः", title_english: "Killing of Paundraka", title_transliteration: "pauṇḍrakavadhaḥ", gist: "Killing the fake Krishna.", benefits: "Removal of hypocrisy and false gurus.", meter: 6, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 84, title_sanskrit: "समन्तपञ्चकतीर्थयात्रा", title_english: "Pilgrimage to Samantapanchaka", title_transliteration: "samantapañcakatīrthayātrā", gist: "Meeting of Vrajavasis at Kurukshetra.", benefits: "Grand family reunions.", meter: 4, num_verses: 11, description: "", bell_verses: [11], prasadam_info: [{ verse: 11, item: "Any fruit or water" }], verses: [] },
  { id: 85, title_sanskrit: "जरासन्ध-शिशुपालवधः", title_english: "Killing of Jarasandha & Shishupala", title_transliteration: "jarāsandha-śiśupālavadhaḥ", gist: "Deaths of Jarasandha and Shishupala.", benefits: "Removal of long-standing enmity.", meter: 39, num_verses: 11, description: "", bell_verses: [11], prasadam_info: [{ verse: 11, item: "Any fruit or water" }], verses: [] },
  { id: 86, title_sanskrit: "साल्ववध-महाभारतयुद्धम्", title_english: "Salva's death & Mahabharata War", title_transliteration: "sālvavadha-mahābhāratayuddham", gist: "War with Salva and the Great War.", benefits: "Victory over complex difficulties.", meter: 1, num_verses: 11, description: "", bell_verses: [5, 6, 10, 11], prasadam_info: [{ verse: 5, item: "Any fruit or water" }, { verse: 11, item: "Any fruit or water" }], verses: [] },
  { id: 87, title_sanskrit: "कुचेलोपाख्यानम्", title_english: "Story of Kuchela (Sudama)", title_transliteration: "kucelopākhyānam", gist: "Story of the poor Brahmin Sudama.", benefits: "Relief from poverty and financial lack.", meter: 6, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Aval (Poha)" }], verses: [] },
  { id: 88, title_sanskrit: "सन्तानगोपालम्", title_english: "Legend of Santana Gopala", title_transliteration: "santānagopālam", gist: "Bringing back the dead children.", benefits: "Longevity and health of children.", meter: 1, num_verses: 12, description: "", bell_verses: [12], prasadam_info: [{ verse: 12, item: "Any fruit or water" }], verses: [] },
  { id: 89, title_sanskrit: "वृकासुरवध-भृगुपरीक्षा", title_english: "Killing of Vrikasura & Bhrigu's test", title_transliteration: "vṛkāsuravadha-bhṛguparīkṣā", gist: "Killing the demon who could burn anything.", benefits: "Protection from black magic/evil spirits.", meter: 1, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 90, title_sanskrit: "भगवन्माहात्म्यम्", title_english: "Greatness of the Lord", title_transliteration: "bhagavanmāhātmyam", gist: "Conclusion of Krishna's greatness.", benefits: "Total surrender and peace.", meter: 1, num_verses: 11, description: "", bell_verses: [11], prasadam_info: [{ verse: 11, item: "Any fruit or water" }], verses: [] },
  { id: 91, title_sanskrit: "भक्तियोगः", title_english: "Path of Devotion", title_transliteration: "bhaktiyogaḥ", gist: "The glory of the path of devotion.", benefits: "Strengthening of one's faith.", meter: 1, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 92, title_sanskrit: "कर्ममिश्रभक्तियोगः", title_english: "Devotion mixed with Action", title_transliteration: "karmamiśrabhaktiyogaḥ", gist: "Devotion coupled with duties.", benefits: "Balanced life of work and worship.", meter: 1, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 93, title_sanskrit: "सांख्ययोगः", title_english: "Path of Knowledge (Sankhya)", title_transliteration: "sāṅkhyayogaḥ", gist: "The path of spiritual knowledge.", benefits: "Mastery over the senses.", meter: 1, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 94, title_sanskrit: "गुणार्चनभक्तियोगः", title_english: "Devotion through qualities", title_transliteration: "guṇārcanabhaktiyogaḥ", gist: "Worshiping the Lord's attributes.", benefits: "Purification of the heart.", meter: 1, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 95, title_sanskrit: "ध्यानयोगः", title_english: "Path of Meditation", title_transliteration: "dhyānayogaḥ", gist: "The method of meditation.", benefits: "Calmness and mental concentration.", meter: 1, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 96, title_sanskrit: "पुरञ्जनोपाख्यानम्", title_english: "Allegory of Puranjana", title_transliteration: "purañjanopākhyānam", gist: "Allegory of the soul's journey.", benefits: "Understanding the purpose of life.", meter: 1, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 97, title_sanskrit: "उत्तमभक्तिलक्षणम्", title_english: "Characteristics of Highest Devotion", title_transliteration: "uttamabhaktilakṣaṇam", gist: "Sign of a superior devotee.", benefits: "Attaining the highest state of Bhakti.", meter: 1, num_verses: 10, description: "", remarks: "End tell 1st slokam of Balamukundashtakam", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 98, title_sanskrit: "ब्रह्मस्वरूपनिरूपणम्", title_english: "Nature of Brahman", title_transliteration: "brahmasvarūpanirūpaṇam", gist: "The nature of the Absolute.", benefits: "Liberation from the cycle of birth.", meter: 1, num_verses: 11, description: "", remarks: "End - namaskaram after each para, repeat last 2 lines thrice", bell_verses: [11], prasadam_info: [{ verse: 11, item: "Any fruit or water" }], verses: [] },
  { id: 99, title_sanskrit: "भगवन्महिमा", title_english: "Glory of the Lord (Final prayer)", title_transliteration: "bhagavanmahimā", gist: "Hymn to the glory of the Lord.", benefits: "General well-being and prosperity.", meter: 1, num_verses: 10, description: "", bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }], verses: [] },
  { id: 100, title_sanskrit: "भगवतः केशादिपादवर्णनम्", title_english: "Description of Lord from head to toe", title_transliteration: "bhagavataḥ keśādipādavarṇanam", gist: "Description of the Lord's beauty.", benefits: "Cure for all diseases (Ayur-Arogya-Saukhyam).", meter: 1, num_verses: 11, description: "", remarks: "Continue with dashakam para 1 and then tell Sri Hare namaha, repeat last 2 lines thrice, repeat nithya's line from para 10 thrice", bell_verses: [11], prasadam_info: [{ verse: 11, item: "Any fruit or water" }], verses: [] },
];

export const TOTAL_DASHAKAMS = 100;
export const TOTAL_VERSES = 1034;
