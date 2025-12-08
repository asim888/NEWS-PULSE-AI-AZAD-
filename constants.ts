
import { Category, Article, TeamMember } from './types';

// Images
export const LOGO_URL = "https://i.postimg.cc/9FT5FFtX/logo.png";
export const ASSET_LOGO_URL = "https://i.postimg.cc/JzFKvjvF/assets.png";
export const FALLBACK_ARTICLE_IMAGE = "https://i.postimg.cc/hj1513Lj/c467305d-1093-458d-8281-26769fe9af73.jpg";
export const IMAGE_ABU_AIMAL = "https://i.postimg.cc/KvskFffK/Abu_Aimal.jpg";
export const IMAGE_AIMAL_AKRAM = "https://i.postimg.cc/7Z264kfr/Aimal_Akram.jpg";
export const SUBSCRIPTION_QR_URL = "https://i.postimg.cc/Dfjhmvgg/90bb0209-8fee-4249-b708-6eeb97e05570.jpg";
export const PRODUCTION_URL = "https://newspulseaiazad.vercel.app";

export const APP_NAME = "News Pulse AI";
export const TAGLINE = "Breaking language barriers with AI-powered news translation and text-to-speech.";
export const ATTRIBUTION = "By Abu Aimal, Aimal Akram & Azad Studio";

export const TEAM: TeamMember[] = [
  {
    name: "Abu Aimal",
    role: "Founder",
    bio: "Founder, Azad Studio & Social Activist. Known for his fearless reporting and dedication to grassroots issues, he uses media as a tool for social change.",
    image: IMAGE_ABU_AIMAL
  },
  {
    name: "Aimal Akram",
    role: "Director & Chief Editor",
    bio: "Director & Chief Editor, Azad Studio. With a sharp editorial vision and strong leadership, he oversees content creation and strategy.",
    image: IMAGE_AIMAL_AKRAM
  }
];

// Expanded RSS Feed Sources
export const RSS_FEEDS: Record<Category, string[]> = {
  [Category.AZAD_STUDIO]: [],
  [Category.FOUNDERS]: [],
  [Category.GALLERY]: [],
  [Category.HYDERABAD]: [
    'https://www.thehindu.com/news/cities/Hyderabad/feeder/default.rss',
    'https://telanganatoday.com/hyderabad/feed',
    'https://www.siasat.com/hyderabad/feed/'
  ],
  [Category.TELANGANA]: [
    'https://www.thehindu.com/news/telangana/feeder/default.rss',
    'https://telanganatoday.com/telangana/feed',
    'https://www.siasat.com/telangana/feed/',
    'https://www.deccanchronicle.com/rss_feed/2.xml'
  ],
  [Category.INDIA]: [
    'https://www.ndtv.com/news/national/feeder/default.rss',
    'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms',
    'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml',
    'https://www.tribuneindia.com/rss/feed/nation',
    'https://www.deccanchronicle.com/rss_feed/15.xml',
    'https://indianexpress.com/section/india/feed/'
  ],
  [Category.INTERNATIONAL]: [
    'https://www.ndtv.com/news/international/feeder/default.rss',
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://www.aljazeera.com/xml/rss/all.xml',
    'https://www.theguardian.com/world/rss',
    'http://rss.cnn.com/rss/edition_world.rss'
  ],
  [Category.SPORTS]: [
    'https://www.thehindu.com/sport/feeder/default.rss',
    'https://www.espncricinfo.com/rss/content/story/feeds/0.xml',
    'https://sports.ndtv.com/rss/all'
  ]
};

const generateFallback = (prefix: string, cat: Category, baseTitle: string, count: number) => {
    return Array.from({length: count}).map((_, i) => ({
        id: `${prefix}${i+1}`,
        title: `${baseTitle} - Update ${i+1}`,
        source: 'News Archive',
        timestamp: `${i+2} hours ago`,
        description: `This is a placeholder description for article ${i+1} in the ${cat} category. It ensures the grid is never empty even if the RSS feed is unreachable.`,
        descriptionRomanUrdu: `Yeh ${cat} category mein article ${i+1} ke liye aik misali matan hai.`,
        category: cat,
        url: '#',
        imageUrl: `https://picsum.photos/800/600?random=${Math.floor(Math.random() * 1000)}`
    }));
};

export const FALLBACK_GALLERY_POSTS: Article[] = [
    {
        id: 'gal1',
        title: 'Community Outreach Event',
        source: 'Azad Gallery',
        timestamp: 'Yesterday',
        description: 'Snapshots from our recent community drive in Hyderabad.',
        category: Category.GALLERY,
        url: '#',
        imageUrl: 'https://picsum.photos/600/800?random=101'
    },
    {
        id: 'gal2',
        title: 'Behind the Scenes: Studio',
        source: 'Azad Gallery',
        timestamp: '2 days ago',
        description: 'The team working hard on the upcoming documentary release.',
        category: Category.GALLERY,
        url: '#',
        imageUrl: 'https://picsum.photos/800/600?random=102'
    },
    {
        id: 'gal3',
        title: 'Award Ceremony 2024',
        source: 'Azad Gallery',
        timestamp: 'Last Week',
        description: 'Moments of pride as Azad Studio receives recognition for unbiased journalism.',
        category: Category.GALLERY,
        url: '#',
        imageUrl: 'https://picsum.photos/600/600?random=103'
    },
     {
        id: 'gal4',
        title: 'Field Reporting',
        source: 'Azad Gallery',
        timestamp: 'Last Week',
        description: 'On-ground reporting from the districts of Telangana.',
        category: Category.GALLERY,
        url: '#',
        imageUrl: 'https://picsum.photos/600/900?random=104'
    }
];

export const FALLBACK_NEWS: Article[] = [
  // --- HYDERABAD ---
  {
    id: 'h1',
    title: 'Hyderabad Metro Expansion Plans Approved',
    source: 'The Hindu',
    timestamp: '2 hours ago',
    description: 'The state government has given the green light for the second phase of the Hyderabad Metro Rail project, connecting the old city to the airport.',
    summaryShort: 'Hyderabad Metro Phase 2 approved by state government. The project will effectively connect the Old City to Shamshabad Airport, easing traffic congestion.',
    descriptionRomanUrdu: 'Riyasati hukumat ne Hyderabad Metro Rail project ke dusre marhale ki manzoori de di hai, jo purane sheher ko airport se jode ga.',
    descriptionUrdu: 'ریاستی حکومت نے حیدرآباد میٹرو ریل پروجیکٹ کے دوسرے مرحلے کی منظوری دے دی ہے، جو پرانے شہر کو ہوائی اڈے سے جوڑے گا۔',
    descriptionHindi: 'राज्य सरकार ने हैदराबाद मेट्रो रेल परियोजना के दूसरे चरण को हरी झंडी दे दी है, जो पुराने शहर को हवाई अड्डे से जोड़ेगी।',
    descriptionTelugu: 'పాతబస్తీని విమానాశ్రయంతో అనుసంధానించే హైదరాబాద్ మెట్రో రైలు ప్రాజెక్టు రెండో దశకు రాష్ట్ర ప్రభుత్వం పచ్చజెండా ఊపింది.',
    category: Category.HYDERABAD,
    url: '#',
    imageUrl: 'https://picsum.photos/800/600?random=1'
  },
  ...generateFallback('h_extra_', Category.HYDERABAD, 'Local Hyderabad News', 9),

  // --- TELANGANA ---
  {
    id: 't1',
    title: 'Telangana Tech Summit 2025 Announced',
    source: 'Telangana Today',
    timestamp: '4 hours ago',
    description: 'Hyderabad is set to host the largest AI and Robotics summit in South Asia next month, attracting global investors.',
    summaryShort: 'Hyderabad to host South Asia’s largest AI & Robotics summit next month. The event aims to attract major global investors to Telangana.',
    descriptionRomanUrdu: 'Hyderabad agle mahine Junoobi Asia ki sab se badi AI aur Robotics summit ki mezbaani kare ga, jis mein almi sarmayakaron ki shirkat mutawaqqa hai.',
    descriptionUrdu: 'حیدرآباد اگلے ماہ جنوبی ایشیا کی سب سے بڑی اے آئی اور روبوٹکس سمٹ کی میزبانی کرے گا، جس میں عالمی سرمایہ کاروں کی شرکت متوقع ہے۔',
    descriptionHindi: 'हैदराबाद अगले महीने दक्षिण एशिया के सबसे बड़े एआई और रोबोटिक्स शिखर सम्मेलन की मेजबानी करने के लिए तैयार है, जो वैश्विक निवेशकों को आकर्षित करेगा।',
    descriptionTelugu: 'హైదరాబాద్ వచ్చే నెలలో దక్షిణాసియాలో అతిపెద్ద ఏఐ మరియు రోబోటిక్స్ సమ్మిట్‌కు ఆతిథ్యం ఇవ్వనుంది, ఇది ప్రపంచ పెట్టుబడిదారులను ఆకర్షిస్తుంది.',
    category: Category.TELANGANA,
    url: '#',
    imageUrl: 'https://picsum.photos/800/600?random=2'
  },
  ...generateFallback('t_extra_', Category.TELANGANA, 'State Development Update', 9),

  // --- INDIA ---
  {
    id: 'i1',
    title: 'India Launches New Solar Mission',
    source: 'NDTV',
    timestamp: '30 mins ago',
    description: 'ISRO successfully launches its advanced solar observatory, aiming to study solar flares and their impact on Earths atmosphere.',
    summaryShort: 'ISRO launches advanced solar observatory to study solar flares. The mission aims to understand the impact of solar activity on Earth’s atmosphere.',
    descriptionRomanUrdu: 'ISRO ne kamyabi ke saath apni advanced solar observatory launch kar di hai, jiska maqsad sooraj ki lahron aur zameen ke mahaul par unke asraat ka mutala karna hai.',
    descriptionUrdu: 'اسرو نے کامیابی کے ساتھ اپنی جدید سولر آبزرویٹری لانچ کر دی ہے، جس کا مقصد سورج کی لہروں اور زمین کے ماحول پر ان کے اثرات کا مطالعہ کرنا ہے۔',
    descriptionHindi: 'इसरो ने अपनी उन्नत सौर वेधशाला को सफलतापूर्वक लॉन्च किया, जिसका उद्देश्य सौर फ्लेयर्स और पृथ्वी के वायुमंडल पर उनके प्रभाव का अध्ययन करना है।',
    descriptionTelugu: 'సౌర మంటలు మరియు భూమి యొక్క వాతావరణంపై వాటి ప్రభావాన్ని అధ్యయనం చేసే లక్ష్యంతో ఇస్రో తన అధునాతన సోలార్ అబ్జర్వేటరీని విజయవంతంగా ప్రయోగించింది.',
    category: Category.INDIA,
    url: '#',
    imageUrl: 'https://picsum.photos/800/600?random=3'
  },
  ...generateFallback('i_extra_', Category.INDIA, 'National News Brief', 9),

  // --- INTERNATIONAL ---
  {
    id: 'w1',
    title: 'Global Climate Accord Reached',
    source: 'BBC',
    timestamp: '1 hour ago',
    description: 'World leaders have signed a historic agreement to reduce carbon emissions by 50% within the next decade.',
    summaryShort: 'Historic global climate agreement signed to cut carbon emissions by 50% in 10 years. World leaders unite for a sustainable future.',
    descriptionRomanUrdu: 'Dunya ke rehnumao ne aane wali dahai mein carbon kharij hone ki miqdar ko 50% tak kam karne ke tareekhi muahiday par dastakhat kiye hain.',
    descriptionUrdu: 'دنیا کے رہنماؤں نے آنے والی دہائی میں کاربن کے اخراج کو 50 فیصد تک کم کرنے کے تاریخی معاہدے پر دستخط کیے ہیں۔',
    descriptionHindi: 'विश्व नेताओं ने अगले दशक के भीतर कार्बन उत्सर्जन को 50% तक कम करने के लिए एक ऐतिहासिक समझौते पर हस्ताक्षर किए हैं।',
    descriptionTelugu: 'రాబోయే దశాబ్దంలో కర్బన ఉద్గారాలను 50% తగ్గించే చారిత్రక ఒప్పందంపై ప్రపంచ నాయకులు సంతకం చేశారు.',
    category: Category.INTERNATIONAL,
    url: '#',
    imageUrl: 'https://picsum.photos/800/600?random=4'
  },
  ...generateFallback('w_extra_', Category.INTERNATIONAL, 'Global Headlines', 9),

  // --- SPORTS ---
  {
    id: 's1',
    title: 'India Wins Thriller Against Australia',
    source: 'ESPN Cricinfo',
    timestamp: '15 mins ago',
    description: 'In a last-over finish, Team India secured a victory by 2 wickets in the opening T20 match of the series.',
    summaryShort: 'Team India wins T20 opener against Australia by 2 wickets in a last-over thriller. A spectacular start to the series.',
    descriptionRomanUrdu: 'Team India ne series ke pehle T20 match mein aakhri over mein 2 wickets se shandaar jeet hasil ki.',
    descriptionUrdu: 'ٹیم انڈیا نے سیریز کے پہلے ٹی 20 میچ میں آخری اوور میں 2 وکٹوں سے شاندار جیت حاصل کی۔',
    descriptionHindi: 'सीरीज के पहले टी20 मैच में टीम इंडिया ने आखिरी ओवर में 2 विकेट से रोमांचक जीत दर्ज की।',
    descriptionTelugu: 'సిరీస్‌లోని ఆరంభ టి20 మ్యాచ్‌లో టీమ్ ఇండియా చివరి ఓవర్‌లో 2 వికెట్ల తేడాతో విజయం సాధించింది.',
    category: Category.SPORTS,
    url: '#',
    imageUrl: 'https://picsum.photos/800/600?random=5'
  },
  ...generateFallback('s_extra_', Category.SPORTS, 'Sports Update', 9),

  // --- AZAD STUDIO ---
  {
    id: 'az1',
    title: 'Azad Studio: New Documentary Release',
    source: 'Azad Studio Updates',
    timestamp: 'Just Now',
    description: 'Our latest documentary "Voices of the Silent" premieres this Friday. Join us for the live screening event.',
    summaryShort: 'Azad Studio premieres "Voices of the Silent" documentary this Friday. Join the live screening to witness this impactful story.',
    descriptionRomanUrdu: 'Hamari nayi documentary "Voices of the Silent" is Jumay ko release ho rahi hai. Live screening event mein humare saath shamil hon.',
    category: Category.AZAD_STUDIO,
    url: '#',
    imageUrl: ASSET_LOGO_URL
  },
  ...generateFallback('az_extra_', Category.AZAD_STUDIO, 'Studio Announcement', 9),
  
  // --- GALLERY ---
  ...FALLBACK_GALLERY_POSTS
];