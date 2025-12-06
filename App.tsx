
import React, { useState, useEffect, useRef } from 'react';
import { Category, Article, TeamMember, UserState, EnhancedArticleContent, SubscriptionStatus, ToastMessage } from './types';
import { APP_NAME, TAGLINE, ATTRIBUTION, FALLBACK_NEWS, LOGO_URL, TEAM, ASSET_LOGO_URL, SUBSCRIPTION_QR_URL } from './constants';
import * as GeminiService from './services/geminiService';
import * as RssService from './services/rssService';
import { getEnv } from './utils/env';

// Icons
const IconCrown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gold-500">
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
  </svg>
);

const IconClose = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const IconPlay = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
  </svg>
);

const IconStop = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
  </svg>
);

// Helper to decode raw PCM from Gemini (24kHz, 1 channel, 16-bit little endian)
const pcmToAudioBuffer = (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): AudioBuffer => {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- Components ---

// 0. Toast Notification
const ToastContainer = ({ toasts, removeToast }: { toasts: ToastMessage[], removeToast: (id: number) => void }) => {
    return (
        <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2">
            {toasts.map(toast => (
                <div key={toast.id} className="bg-noir-900 border border-gold-600/50 p-4 rounded-lg shadow-lg shadow-black/50 animate-fade-in flex flex-col max-w-sm">
                    <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-sm font-bold ${toast.type === 'success' ? 'text-green-400' : 'text-gold-500'}`}>
                            {toast.title}
                        </h4>
                        <button onClick={() => removeToast(toast.id)} className="text-gray-500 hover:text-white">
                            <IconClose />
                        </button>
                    </div>
                    <p className="text-xs text-gray-300">{toast.message}</p>
                </div>
            ))}
        </div>
    );
};

// 1. Interactive Background (Fireball Cursor)
const InteractiveBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const setSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    setSize();
    window.addEventListener('resize', setSize);

    // State
    const mouse = { x: width / 2, y: height / 2 };
    const ball = { x: width / 2, y: height / 2 };

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      size: number;
    }
    const particles: Particle[] = [];

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    
    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Move ball with easing (Smooth follow)
      ball.x += (mouse.x - ball.x) * 0.15;
      ball.y += (mouse.y - ball.y) * 0.15;

      // Add new particles (Fire trail emission)
      for(let k=0; k<3; k++) { // Reduced count
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * 4; // Reduced spread
          particles.push({
              x: ball.x + Math.cos(angle) * r,
              y: ball.y + Math.sin(angle) * r,
              vx: (Math.random() - 0.5) * 1, // Slower velocity
              vy: (Math.random() - 0.5) * 1 - 0.5,
              life: 1.0,
              size: Math.random() * 3 + 1 // Smaller particles
          });
      }

      // Render Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life -= 0.05; 
        p.x += p.vx;
        p.y += p.vy;

        if (p.life <= 0) {
          particles.splice(i, 1);
          i--;
          continue;
        }

        const hue = p.life * 50; 
        const lightness = p.life * 40 + 10;
        const alpha = p.life;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, ${lightness}%, ${alpha})`;
        ctx.fill();
      }

      // Render Fireball Core - SMALLER
      const gradient = ctx.createRadialGradient(ball.x, ball.y, 1, ball.x, ball.y, 12);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      gradient.addColorStop(0.3, 'rgba(255, 215, 0, 0.6)');
      gradient.addColorStop(0.6, 'rgba(255, 69, 0, 0.2)');
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, 14, 0, Math.PI * 2); // Smaller radius (was 30)
      ctx.fill();

      requestAnimationFrame(animate);
    };
    
    const animId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', setSize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-[100]" 
      style={{ mixBlendMode: 'screen' }} 
    />
  );
};

// 2. Welcome Screen
const WelcomeScreen = ({ onEnter }: { onEnter: () => void }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-noir-900 via-black to-noir-800" />
      
      {/* Pulse Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl animate-pulse-slow"></div>

      <div className="relative z-10 flex flex-col items-center text-center p-8">
        
        {/* Logo Container with Circle */}
        <div className="mb-10 relative group animate-fade-in">
          {/* Outer Glow */}
          <div className="absolute inset-0 bg-gold-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000 rounded-full"></div>
          
          {/* Gold Ring */}
          <div className="relative p-1 rounded-full bg-gradient-to-tr from-gold-700 via-gold-500 to-gold-700 shadow-2xl">
             <div className="bg-noir-950 rounded-full p-6 border-4 border-noir-900">
                <img src={LOGO_URL} alt="Logo" className="w-32 h-32 object-contain drop-shadow-xl" />
             </div>
          </div>
        </div>

        {/* App Name */}
        <h1 className="text-5xl md:text-7xl font-serif font-bold text-gold-500 mb-2 tracking-tight drop-shadow-sm">
          {APP_NAME}
        </h1>

        {/* Founders Attribution - Moved Here, Bigger & Gold */}
        <p className="text-lg md:text-2xl text-gold-400 font-serif italic mb-8 tracking-wide">
          By Abu Aimal, Aimal Akram & Azad Studio
        </p>

        {/* Tagline */}
        <p className="text-gray-300 text-lg md:text-xl font-light mb-12 tracking-wide max-w-lg">
          {TAGLINE}
        </p>
        
        <button 
          onClick={onEnter}
          className="group relative px-10 py-5 bg-transparent overflow-hidden rounded-full border-2 border-gold-600 transition-all duration-300 hover:bg-gold-600/10 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
        >
          <span className="relative z-10 text-gold-500 font-bold tracking-widest text-base uppercase group-hover:text-gold-400">
            Enter News Pulse
          </span>
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-gold-600/20 to-transparent transition-transform duration-500" />
        </button>
      </div>
    </div>
  );
};

// 3. Premium Modal
const PremiumModal = ({ onClose, onTrialStart, onPaymentComplete }: { onClose: () => void; onTrialStart: () => void; onPaymentComplete: () => void }) => {
  const [showQr, setShowQr] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="relative bg-noir-900 border border-gold-600 rounded-2xl w-full max-w-md p-8 shadow-2xl shadow-gold-900/20 text-center">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <IconClose />
        </button>
        
        {!showQr ? (
            <>
                <div className="flex justify-center mb-6">
                <div className="p-4 bg-gold-500/10 rounded-full border border-gold-500/30">
                    <IconCrown />
                </div>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-2">Unlock Premium Access</h2>
                <p className="text-gray-400 mb-8">
                Get exclusive access to Hyderabad, Telangana, India, International, and Sports sections.
                </p>
                
                <div className="space-y-4">
                <button 
                    onClick={onTrialStart}
                    className="w-full py-4 bg-gradient-to-r from-gold-600 to-gold-500 text-black font-bold rounded-lg hover:from-gold-500 hover:to-gold-400 transition-all shadow-lg shadow-gold-500/20"
                >
                    Start 3-Day Free Trial
                </button>
                
                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-zinc-800"></div>
                    <span className="flex-shrink mx-4 text-gray-500 text-xs">OR</span>
                    <div className="flex-grow border-t border-zinc-800"></div>
                </div>

                <button 
                    onClick={() => setShowQr(true)}
                    className="w-full py-3 bg-zinc-800 text-gold-500 font-bold rounded-lg hover:bg-zinc-700 transition-all border border-zinc-700"
                >
                    Pay Now via QR Code
                </button>

                <p className="text-xs text-gray-500">$9.00 / month. Cancel anytime.</p>
                </div>
            </>
        ) : (
            <div className="animate-fade-in flex flex-col items-center">
                <h2 className="text-xl font-bold text-white mb-6">Scan to Subscribe</h2>
                
                <div className="bg-white p-3 rounded-xl mb-6 shadow-lg shadow-white/5">
                    <img 
                        src={SUBSCRIPTION_QR_URL} 
                        alt="Payment QR Code" 
                        className="w-48 h-48 object-contain"
                    />
                </div>

                <p className="text-gray-400 text-sm mb-6 max-w-xs">
                    Scan this QR code with any UPI app (GPay, PhonePe, Paytm) to complete your subscription.
                </p>

                <button 
                    onClick={onPaymentComplete}
                    className="w-full py-4 bg-gradient-to-r from-gold-600 to-gold-500 text-black font-bold rounded-lg hover:from-gold-500 hover:to-gold-400 transition-all shadow-lg shadow-gold-500/20 mb-3"
                >
                    I Have Completed Payment
                </button>

                <button 
                    onClick={() => setShowQr(false)}
                    className="text-gray-500 hover:text-white text-sm"
                >
                    Back to Options
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

// 4. Article View Modal (AI & TTS)
interface ArticleModalProps {
  article: Article;
  onClose: () => void;
}

const ArticleModal: React.FC<ArticleModalProps> = ({ article, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [enhancedContent, setEnhancedContent] = useState<EnhancedArticleContent | null>({
    fullArticle: article.content || '',
    summaryShort: article.summaryShort || '',
    summaryRomanUrdu: article.descriptionRomanUrdu || '',
    summaryUrdu: article.descriptionUrdu || '',
    summaryHindi: article.descriptionHindi || '',
    summaryTelugu: article.descriptionTelugu || '',
    fullArticleRomanUrdu: '',
    fullArticleUrdu: '',
    fullArticleHindi: '',
    fullArticleTelugu: '',
  });
  
  const [activeTab, setActiveTab] = useState<'original' | 'summary' | 'roman' | 'urdu' | 'hindi' | 'telugu'>('original');
  const [playing, setPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      try {
        const data = await GeminiService.enhanceArticle(article.id, article.title, article.description);
        setEnhancedContent(data);
      } catch (e) {
        console.error("Failed to enhance", e);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [article]);

  const getContent = () => {
      if (activeTab === 'roman') {
          const summary = enhancedContent?.summaryRomanUrdu || article.descriptionRomanUrdu || "";
          const full = enhancedContent?.fullArticleRomanUrdu || "";
          
          if (full) {
             let content = "";
             if (summary && !full.startsWith(summary)) {
                 content += `**Khulasa (Summary)**\n${summary}\n\n`;
             }
             content += `**Tafseeli Khabar (Full Story)**\n${full}`;
             return content;
          }
          return summary;
      }

      const contentMap: Record<string, string> = {
          'original': enhancedContent?.fullArticle || article.content || article.description || "",
          'summary': enhancedContent?.summaryShort || article.summaryShort || "Summarizing...",
          'urdu': enhancedContent?.fullArticleUrdu || enhancedContent?.summaryUrdu || article.descriptionUrdu || "",
          'hindi': enhancedContent?.fullArticleHindi || enhancedContent?.summaryHindi || article.descriptionHindi || "",
          'telugu': enhancedContent?.fullArticleTelugu || enhancedContent?.summaryTelugu || article.descriptionTelugu || "",
      };
      
      return contentMap[activeTab] || "";
  }

  const handlePlayAudio = async () => {
    if (playing) {
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        audioSourceRef.current = null;
      }
      setPlaying(false);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      return;
    }

    setAudioLoading(true);
    const textToRead = getContent();

    if (!textToRead) {
      setAudioLoading(false);
      alert(loading ? "Please wait, content is generating..." : "No text available.");
      return;
    }

    try {
      const { audioData } = await GeminiService.generateNewsAudio(textToRead);

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      const binaryString = window.atob(audioData);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const buffer = pcmToAudioBuffer(bytes, audioContextRef.current);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setPlaying(false);
      source.start(0);
      
      audioSourceRef.current = source;
      setPlaying(true);

    } catch (err) {
      console.warn("Gemini Audio failed, falling back to Device TTS", err);
      
      if ('speechSynthesis' in window) {
        const lang = GeminiService.getDeviceVoiceLang(activeTab);
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = lang;
        utterance.rate = 0.9;
        
        utterance.text = textToRead.replace(/[*#_]/g, '');

        utterance.onend = () => setPlaying(false);
        utterance.onerror = () => {
          setPlaying(false);
          alert("Audio unavailable on this device.");
        };
        
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        setPlaying(true);
      } else {
        alert("Audio playback failed and your browser does not support text-to-speech.");
      }
    } finally {
      setAudioLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const getTabLabel = (tab: string) => {
      switch(tab) {
          case 'original': return 'English (Full)';
          case 'summary': return 'AI Summary';
          case 'roman': return 'Roman Urdu';
          case 'urdu': return 'Urdu (اردو)';
          case 'hindi': return 'Hindi (हिंदी)';
          case 'telugu': return 'Telugu (తెలుగు)';
          default: return tab;
      }
  }
  
  const getListenButtonText = () => {
    if (audioLoading) return "";
    if (playing) return "Stop Audio";
    
    switch(activeTab) {
      case 'original': return 'Listen to Story';
      case 'summary': return 'Listen to Summary';
      case 'roman': return 'Listen (Roman Urdu)';
      case 'urdu': return 'Listen (Urdu)';
      case 'hindi': return 'Listen (Hindi)';
      case 'telugu': return 'Listen (Telugu)';
      default: return 'Listen';
    }
  }

  const getFontClass = () => {
      if (activeTab === 'urdu') return 'font-serif leading-loose text-right text-xl'; 
      if (activeTab === 'hindi') return 'leading-loose text-lg';
      if (activeTab === 'telugu') return 'leading-loose text-lg';
      return 'leading-relaxed';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-md">
      <div className="bg-noir-900 border border-zinc-800 w-full max-w-3xl h-[95vh] md:h-auto md:max-h-[90vh] rounded-t-2xl md:rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-slide-up">
        
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-noir-800 shrink-0">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} className="w-8 h-8 rounded-full" alt="logo" />
            <span className="text-gold-500 font-bold text-sm tracking-wider">NEWS PULSE AI</span>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-full transition">
            <IconClose />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
           <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">{article.title}</h2>
           <div className="flex items-center gap-3 text-xs text-gray-500 mb-6">
             <span className="bg-zinc-800 px-2 py-1 rounded text-gold-500 border border-zinc-700">{article.source}</span>
             <span>{article.timestamp}</span>
           </div>

           <div className="flex gap-2 mb-6 border-b border-zinc-800 pb-1 overflow-x-auto no-scrollbar">
             {(['original', 'summary', 'roman', 'urdu', 'hindi', 'telugu'] as const).map(tab => (
               <button
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 className={`px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                   activeTab === tab 
                   ? 'text-gold-500 border-b-2 border-gold-500' 
                   : 'text-gray-500 hover:text-gray-300'
                 }`}
               >
                 {getTabLabel(tab)}
               </button>
             ))}
           </div>

           <div className="prose prose-invert prose-amber max-w-none min-h-[200px]">
             {loading && !getContent() ? (
               <div className="space-y-3 animate-pulse">
                 <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
                 <div className="h-4 bg-zinc-800 rounded w-full"></div>
                 <div className="h-4 bg-zinc-800 rounded w-5/6"></div>
                 <p className="text-center text-xs text-gold-600 mt-4">
                    {activeTab === 'roman' 
                      ? "Tarjuma ho raha hai... (Translating to Roman Urdu...)" 
                      : "AI Journalist is translating full article..."}
                 </p>
               </div>
             ) : (
               <div className={`text-gray-300 ${getFontClass()} whitespace-pre-line`}>
                 {getContent()}
               </div>
             )}
             
             {loading && !enhancedContent?.fullArticle && (
                <div className="mt-8 flex justify-center">
                    <span className="text-xs text-gold-600 animate-pulse">Enhancing & Translating...</span>
                </div>
             )}
           </div>
        </div>

        <div className="p-4 border-t border-zinc-800 bg-noir-900 flex flex-between items-center shrink-0">
          <div className="hidden md:block text-xs text-gray-500">
             Powered by Gemini 2.5
          </div>
          <button 
            disabled={audioLoading}
            onClick={handlePlayAudio}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all w-full md:w-auto justify-center ${
              playing 
                ? 'bg-red-900/50 text-red-400 border border-red-800 hover:bg-red-900' 
                : 'bg-gold-500 text-black hover:bg-gold-400 shadow-lg shadow-gold-500/20'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {audioLoading ? (
              <span className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></span>
            ) : (
              <>
                 {playing ? <IconStop /> : <IconPlay />} 
                 {getListenButtonText()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


export default function App() {
  const [hasEntered, setHasEntered] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category>(Category.AZAD_STUDIO);
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
      plan: 'free',
      expiry: null,
      autoRenew: false
  });
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const [newsItems, setNewsItems] = useState<Article[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [breakingHeadlines, setBreakingHeadlines] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast Helper
  const addToast = (title: string, message: string, type: 'success' | 'info' | 'warning' = 'info') => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, title, message, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  // Smart Subscription Logic (Load & Check)
  useEffect(() => {
      const savedSub = localStorage.getItem('subscription_status');
      if (savedSub) {
          const parsed: SubscriptionStatus = JSON.parse(savedSub);
          
          // Check for Expiry
          if (parsed.expiry && parsed.expiry < Date.now()) {
             if (parsed.autoRenew) {
                 // Simulate Auto-Renewal
                 const newExpiry = Date.now() + (30 * 24 * 60 * 60 * 1000); // +30 Days
                 const renewedSub: SubscriptionStatus = { ...parsed, expiry: newExpiry };
                 setSubscription(renewedSub);
                 localStorage.setItem('subscription_status', JSON.stringify(renewedSub));
                 addToast("Subscription Renewed", "Your Premium access has been auto-renewed for another month.", "success");
             } else {
                 // Expire Trial/Sub
                 const expiredSub: SubscriptionStatus = { plan: 'free', expiry: null, autoRenew: false };
                 setSubscription(expiredSub);
                 localStorage.setItem('subscription_status', JSON.stringify(expiredSub));
                 addToast("Trial Ended", "Your free trial has expired. Upgrade to continue Premium access.", "warning");
             }
          } else {
              setSubscription(parsed);
          }
      }
  }, []);

  const handleEnter = () => {
    setHasEntered(true);
    if ('speechSynthesis' in window) {
      const msg = new SpeechSynthesisUtterance("Welcome to News Pulse AI by Azad Studio. Bringing you news in your language, anytime, anywhere.");
      msg.lang = 'en-IN';
      window.speechSynthesis.speak(msg);
    }
  };

  // Subscription Actions
  const startTrial = () => {
      const expiry = Date.now() + (3 * 24 * 60 * 60 * 1000); // 3 Days
      const newSub: SubscriptionStatus = { plan: 'trial', expiry, autoRenew: false };
      setSubscription(newSub);
      localStorage.setItem('subscription_status', JSON.stringify(newSub));
      setShowPremiumModal(false);
      addToast("Trial Started", "You now have 3 days of full Premium access.", "success");
  };

  const completePayment = () => {
      const expiry = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 Days
      const newSub: SubscriptionStatus = { plan: 'premium', expiry, autoRenew: true };
      setSubscription(newSub);
      localStorage.setItem('subscription_status', JSON.stringify(newSub));
      setShowPremiumModal(false);
      addToast("Payment Successful", "Welcome to Premium! Auto-renewal is enabled.", "success");
  };

  const isPremiumActive = subscription.plan === 'premium' || subscription.plan === 'trial';

  const handleCategoryClick = (cat: Category) => {
    const isLocked = cat !== Category.AZAD_STUDIO && cat !== Category.FOUNDERS && !isPremiumActive;
    if (isLocked) {
      setShowPremiumModal(true);
    } else {
      setCurrentCategory(cat);
    }
  };

  useEffect(() => {
     if (currentCategory === Category.AZAD_STUDIO) {
        // Optimization: Studio Updates sidebar removed, so we don't need to fetch RSS news items for this view anymore.
        // We clear newsItems to save state/rendering, as the user only sees the Telegram Iframe.
        setNewsItems([]); 
        setLoadingNews(false);
        return;
     }

     if (currentCategory === Category.FOUNDERS) {
       setNewsItems([]);
       setLoadingNews(false);
       return;
     }

     const loadNews = async () => {
        setLoadingNews(true);
        try {
            const fetchedArticles = await RssService.fetchNewsForCategory(currentCategory);
            
            if (fetchedArticles.length > 0) {
                setNewsItems(fetchedArticles);
            } else {
                console.log("Using Fallback News for", currentCategory);
                setNewsItems(FALLBACK_NEWS.filter(n => n.category === currentCategory));
            }
        } catch (e) {
            console.error("Error loading news", e);
            setNewsItems(FALLBACK_NEWS.filter(n => n.category === currentCategory));
        } finally {
            setLoadingNews(false);
        }
     };

     loadNews();
  }, [currentCategory]);

  // Breaking News (Auto Update every 60s)
  useEffect(() => {
    const loadBreaking = async () => {
        try {
            // Fetch breaking news from ALL categories to make it comprehensive
            const categoriesToFetch = [
                Category.HYDERABAD,
                Category.TELANGANA,
                Category.INDIA,
                Category.INTERNATIONAL,
                Category.SPORTS,
                Category.AZAD_STUDIO
            ];
            
            // Fetch all in parallel
            const results = await Promise.all(
                categoriesToFetch.map(cat => RssService.fetchNewsForCategory(cat))
            );
            
            // Extract top headlines from each section
            const headlines: string[] = [];
            results.forEach((articles) => {
                // Take top 3 from each category
                articles.slice(0, 3).forEach(a => {
                    if (a.title && !headlines.includes(a.title)) {
                        headlines.push(a.title);
                    }
                });
            });
            
            if (headlines.length > 0) {
                setBreakingHeadlines(headlines);
            }
        } catch (e) {
            console.error("Failed to load breaking news", e);
        }
    }
    
    // Initial load
    loadBreaking();

    // Auto-update polling
    const interval = setInterval(loadBreaking, 60000); // 60s
    return () => clearInterval(interval);
  }, []);

  const isAzadChannel = currentCategory === Category.AZAD_STUDIO;
  const isFoundersPage = currentCategory === Category.FOUNDERS;

  return (
    <div className="min-h-screen flex flex-col">
      <InteractiveBackground />
      <ToastContainer toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
      
      {!hasEntered && <WelcomeScreen onEnter={handleEnter} />}

      <header className="sticky top-0 z-30 bg-noir-900/80 backdrop-blur-md border-b border-zinc-800 shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-4">
             <img src={LOGO_URL} alt="Azad Studio" className="w-14 h-14 object-contain drop-shadow-2xl" />
             <div className="flex flex-col justify-center">
               <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold leading-none tracking-tight text-gold-500">
                 {APP_NAME}
               </h1>
               <span className="text-[10px] md:text-xs text-gold-500/80 font-bold uppercase tracking-widest mt-1">
                 Abu Aimal, Aimal Akram & Azad Studio
               </span>
             </div>
          </div>
          <button 
             onClick={() => alert("About Us Modal placeholder")}
             className="text-xs font-medium text-gray-400 hover:text-white border border-zinc-700 px-3 py-1 rounded-full transition-colors hidden sm:block"
          >
            About Us
          </button>
        </div>
        
        <div className="bg-gradient-to-r from-[#5D4037] via-[#5E6C36] to-[#5D4037] text-white text-xs font-bold py-1 overflow-hidden relative whitespace-nowrap flex border-y border-gold-600/30 shadow-lg z-20">
           <div className="animate-marquee inline-block px-4">
             {breakingHeadlines.length > 0 ? (
                <>
                    BREAKING NEWS: {breakingHeadlines.join(" • ")} • {breakingHeadlines.join(" • ")}
                </>
             ) : (
                 "BREAKING NEWS: Hyderabad Metro Phase 2 Approved • ISRO Launches New Solar Probe • India Wins Cricket Series Against Australia • Azad Studio Releases 'Voices of the Silent' • Sensex Hits All-Time High • Telangana Govt Announces New AI Policy • Global Climate Summit Reaches Historic Agreement • World Cup 2026 Schedule Released •"
             )}
           </div>
        </div>
      </header>

      <nav className="bg-noir-950 border-b border-zinc-800 sticky top-[88px] z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2">
            {Object.values(Category).map((cat) => {
               const isActive = currentCategory === cat;
               const isLocked = cat !== Category.AZAD_STUDIO && cat !== Category.FOUNDERS && !isPremiumActive;
               
               return (
                 <button
                   key={cat}
                   onClick={() => handleCategoryClick(cat)}
                   className={`
                     flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap
                     ${isActive 
                        ? 'bg-gold-500 text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                        : 'bg-zinc-900 text-gray-400 border border-zinc-800 hover:border-gold-600 hover:text-gold-500'}
                   `}
                 >
                   {cat}
                   {isLocked && <IconCrown />}
                 </button>
               )
            })}
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        
        {isAzadChannel ? (
          <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
               <div className="flex items-center justify-center mb-6">
                 <div className="flex items-center gap-2 bg-noir-900 border border-gold-600/30 px-4 py-2 rounded-full shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <h2 className="text-gold-500 text-sm font-bold uppercase tracking-widest">Azad Studio Live</h2>
                 </div>
               </div>
               <div className="bg-zinc-900 border border-zinc-800 rounded-xl h-[75vh] flex items-center justify-center relative overflow-hidden shadow-2xl shadow-black">
                 <iframe 
                   src="https://t.me/s/AzadStudioOfficial?embed=1&discussion=1" 
                   className="w-full h-full border-none"
                   title="Azad Studio Telegram"
                 />
                 <div className="absolute inset-0 -z-10 flex flex-col items-center justify-center text-zinc-700">
                    <p>Loading Secure Telegram Feed...</p>
                 </div>
               </div>
          </div>
        ) : isFoundersPage ? (
          <div className="space-y-12 animate-fade-in">
             <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                  Architects of <span className="text-gold-500">Truth</span> & <span className="text-gold-500">Technology</span>
                </h2>
                <div className="w-24 h-1 bg-gold-600 mx-auto rounded-full"></div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-noir-900 border border-zinc-800 p-8 rounded-2xl relative overflow-hidden group hover:border-gold-600/30 transition-all">
                   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <IconCrown />
                   </div>
                   <h3 className="text-gold-500 text-sm font-bold uppercase tracking-widest mb-4">Our Mission</h3>
                   <p className="text-xl md:text-2xl font-serif text-white leading-relaxed">
                     "To empower every citizen with unbiased, real-time news in the language they understand best. We bridge the gap between complex global events and local understanding."
                   </p>
                </div>
                <div className="bg-noir-900 border border-zinc-800 p-8 rounded-2xl relative overflow-hidden group hover:border-gold-600/30 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                       <IconCrown />
                    </div>
                   <h3 className="text-gold-500 text-sm font-bold uppercase tracking-widest mb-4">Our Vision</h3>
                   <p className="text-xl md:text-2xl font-serif text-gray-300 leading-relaxed">
                     "A world where language is no longer a barrier to truth. We envision a digital ecosystem where AI serves humanity by making knowledge accessible, inclusive, and instant."
                   </p>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {TEAM.map((founder, idx) => (
                   <div key={founder.name} className="bg-black border border-zinc-800 rounded-3xl overflow-hidden hover:border-gold-600 hover:shadow-[0_0_30px_rgba(170,140,44,0.2)] transition-all duration-500 group">
                      <div className="aspect-[3/4] w-full relative overflow-hidden bg-noir-950">
                         <img 
                            src={founder.image} 
                            alt={founder.name} 
                            className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                         />
                         <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                         <div className="absolute bottom-0 left-0 p-6">
                            <h3 className="text-3xl font-black text-white mb-1" style={{ textShadow: '2px 2px 0 #AA8C2C' }}>
                               {founder.name}
                            </h3>
                            <p className="text-gold-500 font-bold uppercase tracking-widest text-xs">
                               {founder.role}
                            </p>
                         </div>
                      </div>
                      <div className="p-8 bg-noir-900 relative">
                         <div className="absolute top-0 left-8 -translate-y-1/2 w-12 h-1 bg-gold-600"></div>
                         <p className="text-gray-400 leading-relaxed text-sm md:text-base">
                            {founder.bio}
                         </p>
                         <div className="mt-6 flex gap-4 pt-6 border-t border-zinc-800/50">
                             <button className="text-xs text-gold-600 hover:text-white uppercase font-bold tracking-wider transition-colors">
                                Connect on LinkedIn
                             </button>
                             <button className="text-xs text-gold-600 hover:text-white uppercase font-bold tracking-wider transition-colors">
                                Follow on Twitter
                             </button>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        ) : (
          <div>
            {loadingNews ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="bg-noir-900 border border-zinc-800 rounded-xl overflow-hidden h-96 animate-pulse">
                            <div className="bg-zinc-800 h-48 w-full"></div>
                            <div className="p-4 space-y-3">
                                <div className="bg-zinc-800 h-4 w-1/4 rounded"></div>
                                <div className="bg-zinc-800 h-6 w-3/4 rounded"></div>
                                <div className="bg-zinc-800 h-4 w-full rounded"></div>
                                <div className="bg-zinc-800 h-4 w-full rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {newsItems.map(article => (
                    <div 
                        key={article.id}
                        onClick={() => setSelectedArticle(article)}
                        className="group bg-noir-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-gold-600/50 hover:shadow-[0_0_20px_rgba(212,175,55,0.1)] transition-all cursor-pointer flex flex-col"
                    >
                        <div className="relative h-36 overflow-hidden bg-black">
                            <img 
                                src={article.imageUrl || LOGO_URL} 
                                alt={article.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                                onError={(e) => { (e.target as HTMLImageElement).src = LOGO_URL; }} 
                            />
                            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur text-white text-[10px] px-2 py-1 rounded border border-white/10">
                                {article.category}
                            </div>
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                            <div className="flex items-center gap-2 mb-2">
                                <img src={ASSET_LOGO_URL} className="w-10 h-10 object-contain" alt="News Pulse" />
                                <span className="text-[10px] text-gray-400 uppercase tracking-widest">
                                    {article.timestamp}
                                </span>
                            </div>

                            <h3 className="text-white font-bold text-lg leading-snug mb-3 group-hover:text-gold-400 transition-colors line-clamp-3">
                                {article.title}
                            </h3>
                            <div className="flex-1 space-y-3">
                                {article.description && 
                                 article.description.trim() !== article.title.trim() && 
                                 !article.description.toLowerCase().startsWith(article.title.toLowerCase().slice(0, 20)) && (
                                   <p className="text-gray-400 text-sm line-clamp-3">
                                       {article.description}
                                   </p>
                                )}
                                
                                <div className="border-t border-zinc-800 pt-2 mt-2">
                                    <p className="text-gold-600/70 text-[10px] uppercase font-bold mb-1 tracking-wider">Roman Urdu</p>
                                    {article.descriptionRomanUrdu ? (
                                        <p className="text-gray-500 text-xs italic font-medium leading-relaxed">
                                            "{article.descriptionRomanUrdu}"
                                        </p>
                                    ) : (
                                        <p className="text-gray-600/60 text-[10px] italic font-medium leading-relaxed">
                                            Tap card to generate Roman Urdu translation...
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    ))}
                </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-black border-t border-zinc-900 pt-16 pb-8 mt-auto relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-600/50 to-transparent"></div>
         <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl"></div>

         <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4">
               <div className="flex items-center gap-3">
                 <img src={LOGO_URL} className="w-16 h-16 grayscale hover:grayscale-0 transition duration-500 drop-shadow-lg" alt="logo" />
                 <div>
                    <h4 className="text-xl font-black text-white tracking-tight" style={{ textShadow: '1px 1px 0 #AA8C2C' }}>{APP_NAME}</h4>
                    <p className="text-[10px] text-gold-500 font-bold uppercase tracking-widest">Azad Studio Production</p>
                 </div>
               </div>
               <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
                 Breaking language barriers with AI-powered news translation and text-to-speech. Bringing you news in your language, anytime, anywhere.
               </p>
               <div className="flex gap-4 mt-4">
                  <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(getEnv('PRODUCTION_URL') || 'https://newspulseai.vercel.app')}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:border-gold-500 hover:text-gold-500 transition cursor-pointer">
                    <span className="text-xs">X</span>
                  </a>
                  <a href={`https://t.me/share/url?url=${encodeURIComponent(getEnv('PRODUCTION_URL') || 'https://newspulseai.vercel.app')}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:border-gold-500 hover:text-gold-500 transition cursor-pointer">
                    <span className="text-xs">TG</span>
                  </a>
                  <a href={`https://wa.me/?text=${encodeURIComponent(getEnv('PRODUCTION_URL') || 'https://newspulseai.vercel.app')}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:border-gold-500 hover:text-gold-500 transition cursor-pointer">
                    <span className="text-xs">WA</span>
                  </a>
               </div>
            </div>

            <div className="text-center md:text-left space-y-4">
               <h4 className="text-gold-500 font-bold uppercase tracking-wider text-sm border-b border-zinc-800 pb-2 inline-block md:block">Our Vision</h4>
               <p className="text-sm text-gray-400 leading-relaxed">
                 To create a world where language is no longer a barrier to accessing information. We combine cutting-edge AI technology with journalism to deliver news in your preferred language, making global events accessible to everyone.
               </p>
               <p className="text-sm text-gray-500 leading-relaxed italic">
                 "We believe that everyone deserves access to quality journalism in their native language."
               </p>
            </div>

            <div className="text-center md:text-left space-y-4">
               <h4 className="text-gold-500 font-bold uppercase tracking-wider text-sm border-b border-zinc-800 pb-2 inline-block md:block">Azad Studio Team</h4>
               <p className="text-xs text-gray-400">Strategic Partner committed to unbiased, high-quality journalism.</p>
               
               <div className="space-y-3 mt-4">
                  <div className="flex items-center gap-3 justify-center md:justify-start">
                     <img src={TEAM[0].image} className="w-10 h-10 rounded-full border border-zinc-700 transition" />
                     <div>
                        <div className="text-white text-sm font-bold">{TEAM[0].name}</div>
                        <div className="text-[10px] text-gray-500">{TEAM[0].role}</div>
                     </div>
                  </div>
                  <div className="flex items-center gap-3 justify-center md:justify-start">
                     <img src={TEAM[1].image} className="w-10 h-10 rounded-full border border-zinc-700 transition" />
                     <div>
                        <div className="text-white text-sm font-bold">{TEAM[1].name}</div>
                        <div className="text-[10px] text-gray-500">{TEAM[1].role}</div>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center text-[10px] text-gray-600 uppercase tracking-widest">
            <p>© 2025 News Pulse AI. All rights reserved.</p>
            <p className="mt-2 md:mt-0">{ATTRIBUTION}</p>
         </div>
      </footer>

      {showPremiumModal && (
        <PremiumModal 
          onClose={() => setShowPremiumModal(false)} 
          onTrialStart={startTrial}
          onPaymentComplete={completePayment}
        />
      )}

      {selectedArticle && (
        <ArticleModal 
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}

    </div>
  );
}
