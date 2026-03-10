export interface Verse {
  id: string;
  dashakam: number;
  paragraph: number;
  sanskrit: string;
  english: string;
  tamil: string;
  telugu: string;
  malayalam: string;
  hindi: string;
  marathi: string;
  meaning_english: string;
  meaning_tamil: string;
  meaning_telugu: string;
  meaning_malayalam: string;
  meaning_hindi: string;
  meaning_marathi: string;
  meter: string;
  prasadam?: string;
  bell?: boolean;
  benefits?: string;
  audio?: string;
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
export type TranslationLanguage = "english" | "tamil" | "malayalam" | "telugu" | "hindi" | "marathi";
export type Language = "sanskrit" | "english" | "tamil" | "telugu" | "malayalam" | "hindi" | "marathi";

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
  { value: "hindi", label: "Hindi" },
  { value: "marathi", label: "Marathi" },
];

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: "sanskrit", label: "Sanskrit" },
  { value: "english", label: "English" },
  { value: "tamil", label: "Tamil" },
  { value: "telugu", label: "Telugu" },
  { value: "malayalam", label: "Malayalam" },
  { value: "hindi", label: "Hindi" },
  { value: "marathi", label: "Marathi" },
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

export function verseShouldShowBell(dashakam: Dashakam, verseNumber: number): boolean {
  return dashakam.bell_verses.includes(verseNumber);
}

export function getVersePrasadam(dashakam: Dashakam, verseNumber: number): string | undefined {
  const info = dashakam.prasadam_info.find((p) => p.verse === verseNumber);
  return info?.item;
}

function makeVerse(
  dashakam: number, paragraph: number,
  opts: Partial<Verse> & { english: string; meaning_english: string }
): Verse {
  return {
    id: `${dashakam}-${paragraph}`,
    dashakam, paragraph,
    sanskrit: opts.sanskrit || "",
    english: opts.english,
    tamil: opts.tamil || "",
    telugu: opts.telugu || "",
    malayalam: opts.malayalam || "",
    hindi: opts.hindi || "",
    marathi: opts.marathi || "",
    meaning_english: opts.meaning_english,
    meaning_tamil: opts.meaning_tamil || "",
    meaning_telugu: opts.meaning_telugu || "",
    meaning_malayalam: opts.meaning_malayalam || "",
    meaning_hindi: opts.meaning_hindi || "",
    meaning_marathi: opts.meaning_marathi || "",
    meter: opts.meter || "Sragdharā",
    prasadam: opts.prasadam,
    bell: opts.bell,
    benefits: opts.benefits,
    audio: opts.audio,
  };
}

// ============================================
// DASHAKAM 1 — Glory of the Lord (10 verses)
// ============================================
const d1Verses: Verse[] = [
  makeVerse(1, 1, {
    sanskrit: "सान्द्रानन्दावबोधात्मकमनुपमितं कालदेशावधिभ्यां\nनिर्मुक्तं नित्यमुक्तं निगमशतसहस्रेण निर्भास्यमानम् ।\nअस्पष्टं दृष्टमात्रे पुनरुरुपुरुषार्थात्मकं ब्रह्म तत्त्वं\nतत्तावद्भाति साक्षाद्गुरुपवनपुरे हन्त भाग्यं जनानाम् ॥",
    english: "saandraanandaavabOdhaatmakamanupamitaM kaaladeshaavadhibhyaaM\nnirmuktaM nityamuktaM nigamashatasahasreNa nirbhaasyamaanam |\naspaShTaM dR^iShTamaatre punarurupuruShaarthaatmakaM brahma tatvaM\ntattaavadbhaati saakshaadgurupavanapure hanta bhaagyaM janaanaam",
    tamil: "சாந்த்ராநந்தாவபோதாத்மகமநுபமிதம் காலதேசாவதிப்யாம்\nநிர்முக்தம் நித்யமுக்தம் நிகமசதஸஹஸ்ரேண நிர்பாஸ்யமானம் ।\nஅஸ்பஷ்டம் த்ருஷ்டமாத்ரே புநருருபுருஷார்தாத்மகம் ப்ரஹ்ம தத்வம்\nதத்தாவத்பாதி ஸாக்ஷாத்குருபவநபுரே ஹந்த பாக்யம் ஜநாநாம் ॥",
    telugu: "సాంద్రానందావబోధాత్మకమనుపమితం కాలదేశావధిభ్యాం\nనిర్ముక్తం నిత్యముక్తం నిగమశతసహస్రేణ నిర్భాస్యమానమ్ ।",
    malayalam: "സാന്ദ്രാനന്ദാവബോധാത്മകമനുപമിതം കാലദേശാവധിഭ്യാം\nനിർമുക്തം നിത്യമുക്തം നിഗമശതസഹസ്രേണ നിർഭാസ്യമാനം ।\nഅസ്പഷ്ടം ദൃഷ്ടമാത്രേ പുനരുരുപുരുഷാർഥാത്മകം ബ്രഹ്മ തത്ത്വം\nതത്താവദ്ഭാതി സാക്ഷാദ്ഗുരുപവനപുരേ ഹന്ത ഭാഗ്യം ജനാനാം ॥",
    meaning_english: "It is the greatest good fortune of mankind in this Kali Yuga that the eternal truth which grants us salvation manifests itself as Lord Krishna in the holy shrine of Guruvayoor to bless all true devotees. This embodiment of eternal spiritual bliss is beyond any comparison and transcends all limits of time and space. This eternal truth is free of all illusion and is all-pervading, being the root cause of the entire universe. Even the Vedas cannot fully comprehend or describe it but it can be attained through singleminded devotion by the true Bhakthas of Lord Krishna.",
    meaning_tamil: "இந்த கலியுகத்தில் மனிதகுலத்தின் மிகப்பெரிய அதிர்ஷ்டம் என்னவென்றால், நமக்கு முக்தி அருளும் நிரந்தர சத்தியம் குருவாயூரில் ஸ்ரீகிருஷ்ணனாக வெளிப்படுகிறது.",
    meaning_malayalam: "ഈ കലിയുഗത്തിൽ മനുഷ്യരാശിയുടെ ഏറ്റവും വലിയ ഭാഗ്യം, മോക്ഷം നൽകുന്ന ശാശ്വത സത്യം ഗുരുവായൂരിൽ ശ്രീകൃഷ്ണനായി പ്രകടമാകുന്നു.",
    meter: "Sragdharā", bell: true, prasadam: "Any fruit or water",
    audio: "/audio/SL001-01.m4a",
  }),
  makeVerse(1, 2, {
    english: "nishsheShaatmaanamenaM gurupavanapuraadhiishamevaashrayaamaH",
    sanskrit: "एवं दुर्लभ्यवस्तुन्यपि सुलभतया हस्तलब्धे यदन्यत्\nतन्वा वाचा धिया वा भजति बत जनः क्षुद्रतैव स्फुटेयम् ।\nएते तावद्वयं तु स्थिरतरमनसा विश्वपीडापहत्यै\nनिश्शेषात्मानमेनं गुरुपवनपुरेशं भजामो निरन्तम् ॥",
    tamil: "ஏவம் துர்லப்யவஸ்துந்யபி ஸுலபதயா ஹஸ்தலப்தே யதன்யத்\nதன்வா வாசா தியா வா பஜதி பத ஜநஃ க்ஷுத்ரதைவ ஸ்புடேயம் ।",
    malayalam: "ഏവം ദുർലഭ്യവസ്തുന്യപി സുലഭതയാ ഹസ്തലബ്ധേ യദന്യത്\nതന്വാ വാചാ ധിയാ വാ ഭജതി ബത ജനഃ ക്ഷുദ്രതൈവ സ്ഫുടേയമ് ।",
    meaning_english: "Although such an easy access to eternal salvation has been offered to mankind on a silver platter in the form of Lord Krishna at Guruvayoor, common mortals, due to their inherent lowly nature, overlook the eternal benefits of this and go in pursuit of worldly pleasures. May we all realize our folly and serve Him with complete faith as He alone can alleviate all our sorrows.",
    meter: "Sragdharā",
    audio: "/audio/SL001-02.m4a",
  }),
  makeVerse(1, 3, {
    english: "tasmin dhanyaa ramante shrutimatimadhure sugrahe vigrahe te",
    sanskrit: "सत्त्वं यत्तत्पुराणाः परमिह गुणतो जीवहेतुत्रयाणां\nताभ्यामन्यद्विशुद्धं तव तु गुणमयं मायया कल्पितं त्रि ।",
    tamil: "ஸத்வம் யத்தத்புராணாஃ பரமிஹ குணதோ ஜீவஹேதுத்ரயாணாம்\nதாப்யாமன்யத்விசுத்தம் தவ து குணமயம் மாயயா கல்பிதம் த்ரி ।",
    malayalam: "സത്ത്വം യത്തത്പുരാണാഃ പരമിഹ ഗുണതോ ജീവഹേതുത്രയാണാം\nതാഭ്യാമന്യദ്വിശുദ്ധം തവ തു ഗുണമയം മാശയാ കൽപിതം ത്രി ।",
    meaning_english: "The great sage Vyaasa has identified Thy form as Suddha Sathva, unsullied by the evil and impure qualities of Rajas and Tamas. Contemplation of this pure divine form of Lord Krishna will lead us to ultimate bliss and wisdom.",
    meter: "Sragdharā",
    audio: "/audio/SL001-03.m4a",
  }),
  makeVerse(1, 4, {
    english: "kasmaannOniShkalastvaM sakala iti vachastvatkalaasveva bhuuman",
    meaning_english: "Oh Lord Krishna! This unchanging form of Suddha Sathva embodied in Thee, transcending time and space, is the ocean of nectar giving supreme happiness to all true devotees, encompassing all the liberated souls embedded like pure pearls in the waves of this ocean. Hence this incarnation of Thine as Lord Krishna can be called the only complete one, as compared to other revelations of Thy divine form.",
    meter: "Sragdharā",
    audio: "/audio/Snd1v4.m4a",
  }),
  makeVerse(1, 5, {
    english: "sa tvaM dhR^itvaa dadhaasi svamahimavibhavaakuNTha vaikuNTha ruupam",
    meaning_english: "Even without any action or reason, Thy glance alone can activate Maya at the beginning of a new kalpa or cycle of creation, spontaneously. Thus, the divine form of the Lord of Vaikunta manifests itself as Maya or Prakruthi without its glory or purity being diminished or tarnished in any way.",
    meter: "Sragdharā",
    audio: "/audio/Snd1v5.m4a",
  }),
  makeVerse(1, 6, {
    english: "si~nchat sa~nchintakaanaaM vapuranukalaye maarutaagaaranaatha",
    meaning_english: "Oh Guruvayurappa! I meditate on Thy divine form which is more beautiful than the dark rain clouds and the blue Kalaya flowers, where Goddess Lakshmi plays uninhibitedly, which being the abode of beauty, is the ultimate sanctuary of all true devotees, drowning their hearts in the nectar of supreme bliss.",
    meter: "Sragdharā",
    audio: "/audio/Snd1v6.m4a",
  }),
  makeVerse(1, 7, {
    english: "netraiH shrOtraishcha piitvaa paramarasasudhaambhOdhipuure rameran",
    meaning_english: "Oh Supreme One! Earlier, in my ignorance, I had thought that Thy creation was sheer misery to mankind entangling all of us in the cycle of births and deaths; but now I realise how wrong I was. But for this divine miracle of creation, how could our souls be liberated without our eyes and ears drinking the nectar of supreme bliss in a fully conscious state?",
    meter: "Sragdharā",
  }),
  makeVerse(1, 8, {
    english: "kshudraM taM shakravaaTiidrumamabhilaShati vyarthamarthivrajO(a)yam",
    meaning_english: "Oh Hari! Thou art ready to shower on us all that we desire and even more by granting liberation to our wretched souls. But due to our total ignorance of this ultimate bliss, we pursue worldly belongings and sensual pleasures. Men long for the Parijata tree in Indra's garden when the Kalpaka Vriksha in the form of Lord Krishna is waiting to grant them salvation.",
    meter: "Sragdharā",
  }),
  makeVerse(1, 9, {
    english: "stvaM chaatmaaraama evetyatulaguNagaNaadhaara shaure namaste",
    meaning_english: "Oh Souri! Thou art omnipotent and the embodiment of all virtue and hence Thou hath the unique power to grant supreme bliss to Thy devotees instead of only desired objects, in contrast to other gods. Those who realise this truth are blessed at every step they take towards Thee. Oh Lord Krishna! I pray to Thee for such a blessing.",
    meter: "Sragdharā",
  }),
  makeVerse(1, 10, {
    english: "tadvaataagaaravaasin murahara bhagavachChabdamukhyaashrayO(a)si",
    meaning_english: "Oh Lord Murari! Thou art the embodiment of all the six divine qualities of greatness viz., Sri (prosperity), Jnana (knowledge), Vairagya (detachment), Aishwarya (lordliness), Veerya (valour) and Yashas (fame) and hence the word Bhagavath is the most befitting attribution to Thee, who art the resident of the Guruvayur temple.",
    meter: "Sragdharā", bell: true, prasadam: "Any fruit or water",
  }),
];

// ============================================
// DASHAKAM 2 — Sweetness of the Lord's form (10 verses)
// ============================================
const d2Verses: Verse[] = [
  makeVerse(2, 1, {
    english: "tvadruupaM vanamaalyahaarapaTala shriivatsadiipraM bhaje",
    meaning_english: "I pray to the divine form of Lord Krishna adorned by the diamond crown more brilliant than the sun, the upright sandal mark on the forehead, the compassionate eyes, the charming smile, the shapely nose, the cheeks reflecting the light of the earrings brushing against them, the neck resplendent with the Kausthubha jewel and the chest decorated with flower garlands, pearl necklaces and the holy Srivatsa beauty mark.",
    meter: "Sragdharā",
  }),
  makeVerse(2, 2, {
    english: "aalambe vimalaambujadyutipadaaM muurtiM tavaartichChidam",
    meaning_english: "I prostrate before this most beautiful form of Lord Krishna with the four shining arms bedecked with shoulder ornaments, bangles, bracelets, rings studded with precious stones, the mace, the conch, the disc, the lotus, the shining yellow silk robe adorning the waist with the gold belt around it and the beautiful lotus feet which are the ultimate refuge of all devotees for the removal of all their sorrows.",
    meter: "Sragdharā",
  }),
  makeVerse(2, 3, {
    english: "pyaashcharyaM bhuvane na kasya kutukaM puShNaati viShNO vibhO",
    meaning_english: "Oh Omnipotent One! This supreme divine form of Thine transcends all beauty, radiance and sweetness in all the three worlds and generates intense love in the hearts of all true Bhakthas.",
    meter: "Sragdharā",
  }),
  makeVerse(2, 4, {
    english: "premasthairyamayaadachaapala balaat chaapalya vaartOdabhuut",
    meaning_english: "Oh Lord Achutha! Goddess Lakshmi being so attached to Thee cannot remain long with any of her devotees. Hence she has earned the epithet Chapala or Fickleminded one as far as her Bhakthas are concerned. So strong and steadfast is her love for Thee.",
    meter: "Sragdharā",
  }),
  makeVerse(2, 5, {
    english: "steShveShaa vasati sthiraiva dayitaprastaavadattaadaraa",
    meaning_english: "Oh Lakshmipathi! Goddess Lakshmi's firm love of Thee makes her shower blessings on all those devotees who are ever praising Thy qualities and worshipping Thee. Her fickleness is only with regard to those who have no love or respect for Thee.",
    meter: "Sragdharā",
  }),
  makeVerse(2, 6, {
    english: "vyaasi~nchatyapi shiitabaaShpa visarairaanandamuurChOdbhavaiH",
    meaning_english: "Description of Thy divine form is like nectar to the ears and minds of devotees, drenching their bodies in ecstasy and taking them to the extremes of bliss.",
    meter: "Sragdharā",
  }),
  makeVerse(2, 7, {
    english: "bhaktirnishramameva vishvapuruShairlabhyaa ramaavallabha",
    meaning_english: "Oh Lord Krishna! Therefore Bhakthi Yoga or the path of devotion is recommended by great sages to be far superior to Karma Yoga (or path of action) or Jnana Yoga (or path of spiritual knowledge) in the quest for salvation and it can be attained effortlessly through intense love for Thy divine form.",
    meter: "Sragdharā",
  }),
  makeVerse(2, 8, {
    english: "tvatpremaatmakabhaktireva satataM svaadiiyasii shreyasii",
    meaning_english: "Oh Most Powerful One! Karma Yoga yields results only in the distant future and Jnana Yoga is beyond the comprehension of ordinary mortals. But devotion to Thee is far more satisfying to our minds.",
    meter: "Sragdharā",
  }),
  makeVerse(2, 9, {
    english: "shchittaardratvamR^ite vichintya bahubhissiddhyanti janmaantaraiH",
    meaning_english: "Performance of Karma Yoga is very exhausting and leads us to the path of Jnana or Bhakthi only after our mind has been cleansed of impurities. Philosophical search for eternal truth can lead to salvation only after a painful process of life cycles and rebirths. Is it not then more prudent to adopt the path of Bhakthi directly?",
    meter: "Sragdharā",
  }),
  makeVerse(2, 10, {
    english: "premaprauDhirasaardrataa drutataraM vaataalayaadhiishvara",
    meaning_english: "Oh Lord Krishna! Bhakthi is the most superior path to merge with Thee and leads us to the state of pure divinity without delay. I pray to Thee to grant me the ability to be steeped in devotion to Thy lotus feet.",
    meter: "Sragdharā", bell: true, prasadam: "Any fruit or water",
  }),
];

// ============================================
// DASHAKAM 3 — Qualities of an ideal devotee (10 verses)
// ============================================
const d3Verses: Verse[] = [
  makeVerse(3, 1, {
    english: "nahaM dhanyaan manye samadhigatasarvaabhilaShitaan",
    meaning_english: "Oh Varada! Those Bhakthas who constantly chant Thy names and worship Thy divine form have all their righteous wishes fulfilled by Thee and are indeed the most blessed souls.",
    meter: "Sragdharā",
  }),
  makeVerse(3, 2, {
    english: "nahaM gaayaM gaayaM kuhachana vivatsyaami vijane",
    meaning_english: "Oh Lord Vishnu! Plagued as I am by diseases both physical and mental I am unable to turn my mind towards Thee. Please have pity on me and help me to sit peacefully in some quiet place chanting Thy innumerable names and worshipping Thy lotus feet.",
    meter: "Sragdharā",
  }),
  makeVerse(3, 3, {
    english: "bhavadbhaktaa muktaaH sukhagatimasaktaa vidadhate",
    meaning_english: "Nothing is impossible for one who has been blessed by Thee. Innumerable devotees of Thine have been liberated from their sorrows and worldly ties by Thy mercy. Can I not be one such fortunate devotee of Thine?",
    meter: "Sragdharā",
  }),
  makeVerse(3, 4, {
    english: "tsadaanandaadvaitaprasaraparimagnaaH kimaparam",
    meaning_english: "Many great sages like Narada have attained Supreme Bliss by meditating on Thy lotus feet and are now free to wander at will drowned in the complete state of conscious Bliss beyond all limits of time and space. Is there anything more for them to attain?",
    meter: "Sragdharā",
  }),
  makeVerse(3, 5, {
    english: "bhavenmithyaa rathyaapuruShavachanapraayamakhilam",
    meaning_english: "Please help me to become more and more devoted to Thee as that is the only remedy for all my woes. There is no doubt at all in my mind about this. For otherwise, all of Vyasa's teachings, Thy divine sayings and even the Vedas will become meaningless like the utterances of a street wanderer.",
    meter: "Sragdharā",
  }),
  makeVerse(3, 6, {
    english: "nmahaanandaadvaitaM dishati kimataH praarthyamaparam",
    meaning_english: "Chanting Thy names and singing Thy praises is a sweet pleasure from the start. As devotion becomes more intense it eliminates all suffering and ultimately it leads the mind to the path of supreme knowledge and bliss. What more can a Bhaktha crave for?",
    meter: "Sragdharā",
  }),
  makeVerse(3, 7, {
    english: "parighraaNe ghraaNaM shravaNamapi te chaarucharite",
    meaning_english: "Oh Lord! Rid me of all sorrows. May my feet walk joyfully to Thy temple; may my hands serve Thee with fervour; may my eyes be eager to feast on Thy divine image; may my nostrils be pervaded with the scent of the holy Tulsi leaves at Thy feet and may my ears drink in Thy delightful stories.",
    meter: "Sragdharā",
  }),
  makeVerse(3, 8, {
    english: "yathaa vismaryaasaM durupashamapiiDaaparibhavaan",
    meaning_english: "May Thy divine form embodying the Supreme Bliss envelop my mind and heart so completely that I am forced to forget all my physical maladies and experience only the thrill of shedding tears of joy in this state.",
    meter: "Sragdharā",
  }),
  makeVerse(3, 9, {
    english: "bhavadbhaktOttamsaM jhaTiti kuru maaM kamsadamana",
    meaning_english: "Oh Kamsanthaka! Those who have no love or regard for Thee are thriving all round me. But in spite of my devotion to Thee, I am drowned in sorrow. Oh Varada! Is not Thy reputation of mercy to Thy devotees at stake here? Oh Lord! Please remove my afflictions and make me a worthy devotee of Thee.",
    meter: "Sragdharā",
  }),
  makeVerse(3, 10, {
    english: "nyathaashakti vyaktaM natinutiniShevaa virachayan",
    meaning_english: "What else is there for me to pray for? I shall stop lamenting and spend my time doing pooja and singing hymns of praise to Thy lotus feet until Thou doth take pity on me and bless me.",
    meter: "Sragdharā", bell: true, prasadam: "Any fruit or water",
  }),
];

// ============================================
// DASHAKAM 4 — Practice of Ashtanga Yoga (13 verses)
// ============================================
const d4Verses: Verse[] = [
  makeVerse(4, 1, {
    english: "spaShTamaShTavidhayOgacharyayaa puShTayaa(a)(a)shu tava tuShTimaapnuyaam",
    meaning_english: "Oh Lord! Grant me a strong and healthy body to serve Thee; then with Thy blessing I shall surely become proficient in doing the eightfold yoga of concentration.",
    meter: "Vasantatilakā",
  }),
  makeVerse(4, 2, {
    english: "kurmahe dR^iDhamamii sukhaasanaM pankajaadyamapi vaa bhavatparaaH",
    meaning_english: "By practising selfcontrol through celibacy, honesty and nonviolence and by observing the daily rituals of bathing, meditation etc., I shall cleanse my body and mind and perform the Padmasana (lotus posture) and other aasanas and worship Thee.",
    meter: "Vasantatilakā",
  }),
  makeVerse(4, 3, {
    english: "indriyaaNi viShayaadathaapahR^ityaa(a)(a)smahe bhavadupaasanOnmukhaaH",
    meaning_english: "Chanting the Pranava mantra (OM) continuously and thus controlling the sense organs I shall purify myself and concentrate on Thee.",
    meter: "Vasantatilakā",
  }),
  makeVerse(4, 4, {
    english: "tena bhaktirasamantaraardrataamudvahema bhavadanghrichintakaaH",
    meaning_english: "Through repeated effort I shall try to focus my mind on Thy form which is intangible. But by meditating on Thy lotus feet I shall try to capture the ecstasy of true devotion.",
    meter: "Vasantatilakā",
  }),
  makeVerse(4, 5, {
    english: "ashramaM manasi chintayaamahe dhyaanayOganirataastvadaashrayaaH",
    meaning_english: "By intense and repeated effort I shall be able to visualise through my mind's eye the loveliness of each and every limb of Thy divine form and effortlessly meditate on it.",
    meter: "Vasantatilakā",
  }),
  makeVerse(4, 6, {
    english: "saandramOda rasa ruupamaantaraM brahmaruupamayi te(a)vabhaasate",
    meaning_english: "Oh Lord! Those who concentrate on Thy divine form will be entranced by its beauty and gradually their minds will be transported to a higher level wherein they can comprehend the impersonal Brahman or eternal truth and bliss.",
    meter: "Vasantatilakā",
  }),
  makeVerse(4, 7, {
    english: "aashritaaH punarataH parichyutaavaarabhemahi cha dhaaraNaadikam",
    meaning_english: "Oh Viswanatha! Having reached the apex of spiritual concentration which is supreme bliss, we must again, on relaxation, begin afresh the process of Dharana and follow the same steps in ascending order.",
    meter: "Vasantatilakā",
  }),
  makeVerse(4, 8, {
    english: "muktabhaktakulamaulitaaM gataaH sa~ncharema shukanaaradaadivat",
    meaning_english: "The constant practice of this process of concentration is in itself an enjoyable experience in the attainment of supreme bliss. Our souls will be liberated by this process and be free to wander about like the most exalted devotees Suka, Narada etc., singing Thy glory.",
    meter: "Vasantatilakā",
  }),
  makeVerse(4, 9, {
    english: "yOgavashyamanilaM ShaDaashrayairunnayatyaja suShumnayaa shanaiH",
    meaning_english: "Thus the Yogi who attains Samadhi is able to control his life breath and draw it upward along the Sushumna nerve past the six nerve centres in his quest for salvation.",
    meter: "Vasantatilakā",
  }),
  makeVerse(4, 10, {
    english: "uurdhvalOkakutukii tu muurdhataH saardhameva karaNairniriiyate",
    meaning_english: "Then leaving this earthly body those who wish for immediate salvation merge with Thee, while those who wish for the pleasures of the higher worlds go with the sense organs piercing the head.",
    meter: "Vasantatilakā",
  }),
  makeVerse(4, 11, {
    english: "praapitO ravipadaM bhavatparO mOdavaan dhruvapadaantamiiyate",
    meaning_english: "Thus Thy devotee who is led to the solar world by the presiding deities of fire, daylight, the waxing fortnight of the moon and the summer solstice goes on to the world of Dhruva.",
    meter: "Vasantatilakā",
  }),
  makeVerse(4, 12, {
    english: "iiyate bhavadupaashrayastadaa vedasaH padamataH puraiva vaa",
    meaning_english: "Then, after a long sojourn in Maharloka, Thy devotee, as soon as he is afflicted by the scorching fire issuing forth from the serpent Sesha, or even before that, reaches Satyaloka or the world of Brahma.",
    meter: "Vasantatilakā",
  }),
  makeVerse(4, 13, {
    english: "sachchidaatmaka bhavadguNOdayaanuchcharantamanilesha paahi maam",
    meaning_english: "Oh Jagannatha! One who successfully completes this arduous soul-searching journey does not come down again. I am Thy humble devotee singing Thy praises. Please save me, Oh Lord of Guruvayur, who art the embodiment of truth and reality.",
    meter: "Vasantatilakā",
  }),
  makeVerse(4, 14, {
    english: "tattadaatmakatayaa vishan sukhii yaati te padamanaavR^itaM vibhO",
    meaning_english: "Oh Lord! The Brahmanda is encased in seven covers viz. the five elements, earth, water, fire, air, ether and then intellect and illusion. Thy devotee breaks through all these barriers experiencing the pleasures in each of these and finally attains salvation at Thy lotus feet.",
    meter: "Vasantatilakā",
  }),
  makeVerse(4, 15, {
    english: "sachchidaatmaka bhavadguNOdayaanuchcharantamanilesha paahi maam",
    meaning_english: "Oh Jagannatha! One who successfully completes this arduous soul-searching journey does not come down again. I am Thy humble devotee singing Thy praises. Please save me, Oh Lord of Guruvayur, who art the embodiment of truth and reality.",
    meter: "Vasantatilakā", bell: true, prasadam: "Any fruit or water",
  }),
];

// ============================================
// DASHAKAM 5 — Manifestation of the Cosmic Form (10 verses)
// ============================================
const d5Verses: Verse[] = [
  makeVerse(5, 1, {
    english: "statraikastvamashiShyathaaH kila paraanandaprakaashaatmanaa",
    meaning_english: "When the earlier great deluge occurred, the world was nonexistent and Maya was merged in Thy Supreme Form undiscernible in any way. There was no life or death and no day or night. Only Thy brilliant form of Supreme Bliss existed.",
    meter: "Sragdharā",
  }),
  makeVerse(5, 2, {
    english: "nO chet kiM gaganaprasuunasadR^ishaaM bhuuyO bhavetsambhavaH",
    meaning_english: "Oh Lord! At that point of time everything in the Universe viz. Kala (time), Karma (action), Guna (mood), the Jivathmas (individual souls) all lay merged in Thy supreme form. But they were never nonexistent or imaginary like flowers of the sky. They were ensconced in Thee and re-emerged after the deluge.",
    meter: "Sragdharā",
  }),
  makeVerse(5, 3, {
    english: "praadurbhuuya guNaanvikaasya vidadhustasyaassahaayakriyaam",
    meaning_english: "This state lasted for two Parardhas. Then with the desire for creation Thou activated Maya with a single glance and the evolution of the three worlds began. From Maya came Kalashakthi, the hidden resultant Karmas of the Jivas and inborn dispositions (swabhavas). From these evolved the Gunas or moods and helped Maya to manifest as the universe.",
    meter: "Sragdharā",
  }),
  makeVerse(5, 4, {
    english: "maayaa saa khalu buddhitattvamasR^ijadyO(a)sau mahaanuchyate",
    meaning_english: "The Vedas describe Thee as a witness to the creation of Maya. Yet Thy form is not enveloped by Maya. Thou art the one and only individual soul reflected on Maya in different forms. Time, action, nature have all been ordained by Thee. The very same Maya, influenced by these forces, created the principle of intelligence called 'Mahat'.",
    meter: "Sragdharā",
  }),
  makeVerse(5, 5, {
    english: "sampuShTaM triguNaistamO(a)tibahulaM viShNO bhavatpreraNaat",
    meaning_english: "This principle of intelligence is endowed with the three gunas. The sathvic guna created in the total soul the cognizance of unqualified Self. But this same intelligence being predominantly Tamasic in nature created the cognizance of qualified self viz. ahamkara or egoism in that very soul.",
    meter: "Sragdharā",
  }),
  makeVerse(5, 6, {
    english: "vahniindraachyutamitrakaan vidhuvidhishriirudrashaariirakaan",
    meaning_english: "This ahamkara or ego changed into three different forms, the Vaikarika with sathvic quality, and the Thaijasa dominated by Rajas and Tamas. From the Sathvic guna came the presiding deities of senses like Direction (Disha), Air (Vayu), Sun (Surya), Varuna, Aswini Devas, Fire (Agni), Vishnu, Mitra, Prajapathi, Moon (Chandra), Brahma, Rudra and Kshetrajna.",
    meter: "Sragdharā",
  }),
  makeVerse(5, 7, {
    english: "tanmaatraM nabhasO marutpurapate shabdO(a)jani tvadbalaat",
    meaning_english: "From the Sathvic part of Ahamkara was created the Anthakarana or internal sense which is a combination of Chitta, mind, intellect and egoism. From the Rajasa part came the set of ten senses and from the Tamasa part Thou created Shabda or sound which is the prime essence of the sky.",
    meter: "Sragdharā",
  }),
  makeVerse(5, 8, {
    english: "bhuutagraamamimaM tvameva bhagavan praakaashayastaamasaat",
    meaning_english: "From Shabda Thou created the sky. From that came touch (sparsha); from which air or vayu was born; from that came rupa or form; from rupa came agni or fire; from fire came taste; then came water from taste; from water came smell and from smell earth was formed. Thus Oh Lord Madhava! Thou caused the group of elements to manifest from tamasa egoism with each one of them having the qualities of those created prior to them and hence all of them being interconnected.",
    meter: "Sragdharā",
  }),
  makeVerse(5, 9, {
    english: "shcheShThaa shaktimudiirya taani ghaTayan hairaNyamaNDaM vyadhaaH",
    meaning_english: "These groups of elements, senses and their presiding deities did not themselves create the Universe. These deities sang Thy praises in various hymns and Thou entered these fundamentals and by impelling them to combine with one another created the Golden Egg or Hiranyagarbha which is the Universe.",
    meter: "Sragdharā",
  }),
  makeVerse(5, 10, {
    english: "nirbhaatO(a)si marutpuraadhipa sa maaM traayasva sarvaamayaat",
    meaning_english: "This Brahmanda or Cosmic Egg lay for a thousand years in the primal water created earlier. Then exploding it, Thou came in the form called Virata Purusha of the fourteen worlds. In that form Thou shone as the total form of all individual souls with thousands of hands, feet and heads. Oh Guruvayurappa! May that divine form of Thine be the saviour of all my ills.",
    meter: "Sragdharā", bell: true, prasadam: "Any fruit or water",
  }),
];

// All 100 Dashakams with metadata from SN_DB
export const sampleDashakams: Dashakam[] = [
  {
    id: 1, title_sanskrit: "भगवतः स्वरूपं तथा माहात्म्यम्", title_english: "Glory of the Lord",
    title_transliteration: "bhagavataḥ svarūpaṁ tathā māhātmyam", gist: "Description of the formless and form aspects of the Lord.",
    benefits: "Attainment of devotion and removal of obstacles.", meter: 1, num_verses: 10,
    description: "Description of the divine form of Lord Narayana at Guruvayur",
    bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }],
    verses: d1Verses,
  },
  {
    id: 2, title_sanskrit: "भगवतः स्वरूपमाधुर्यं तथा भक्तिमहत्त्वम्", title_english: "Sweetness of the Lord's form",
    title_transliteration: "bhagavataḥ svarūpamādhuryam tathā bhaktimahattvam", gist: "The sweetness of the Lord's form and superiority of Bhakti.",
    benefits: "Mental peace and purity of thought.", meter: 1, num_verses: 10, description: "",
    bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }],
    verses: d2Verses,
  },
  {
    id: 3, title_sanskrit: "उत्तमभक्तस्य गुणाः", title_english: "Qualities of an ideal devotee",
    title_transliteration: "uttamabhaktasya guṇāḥ", gist: "Characteristics of a true devotee.",
    benefits: "Developing dispassion and focus in prayer.", meter: 1, num_verses: 10, description: "",
    bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }],
    verses: d3Verses,
  },
  {
    id: 4, title_sanskrit: "योगाभ्यासः तथा योगसिद्धिः", title_english: "Practice of Ashtanga Yoga",
    title_transliteration: "yogābhyāsaḥ tathā yogasiddhiḥ", gist: "The practice of Yoga and control of breath.",
    benefits: "Physical health and steady mind.", meter: 4, num_verses: 15, description: "",
    bell_verses: [15], prasadam_info: [{ verse: 15, item: "Any fruit or water" }],
    verses: d4Verses,
  },
  {
    id: 5, title_sanskrit: "विराट्पुरुषोत्पत्तिः", title_english: "Manifestation of the Cosmic Form",
    title_transliteration: "virāṭpuruṣotpattiḥ", gist: "The manifestation of the Cosmic Form.",
    benefits: "Knowledge of the universe's origin.", meter: 1, num_verses: 10, description: "",
    bell_verses: [10], prasadam_info: [{ verse: 10, item: "Any fruit or water" }],
    verses: d5Verses,
  },
  // Dashakams 6-100 with metadata, verses to be populated
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
