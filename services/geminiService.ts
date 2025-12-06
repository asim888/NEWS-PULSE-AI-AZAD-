import { GoogleGenAI, Type, Modality } from "@google/genai";
import { EnhancedArticleContent } from "../types";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

// In a real app, this would be environment variable. 
let ai: GoogleGenAI | null = null;

const getAI = () => {
  if (!ai) {
    // Guidelines strict requirement: Use process.env.API_KEY directly.
    if (process.env.API_KEY) {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    } else {
        console.error("API_KEY is missing in process.env");
    }
  }
  return ai;
};

// --- In-Memory Cache (L1) ---
// We keep this for the current session speed, but Supabase (L2) is the persistent layer.
const articleMemoryCache = new Map<string, EnhancedArticleContent>();
const audioMemoryCache = new Map<string, string>();

// --- Helper for Device TTS Language ---
export const getDeviceVoiceLang = (tab: string): string => {
    switch (tab) {
        case 'urdu': return 'ur-IN';
        case 'hindi': return 'hi-IN';
        case 'telugu': return 'te-IN';
        // Roman Urdu uses English script, so we use English voice
        default: return 'en-IN';
    }
};

// --- Text Generation ---

export const enhanceArticle = async (
  id: string,
  title: string,
  description: string
): Promise<EnhancedArticleContent> => {
  // 1. Check L1 Memory Cache
  if (articleMemoryCache.has(id)) {
    console.log(`[Memory Cache Hit] Article ${id}`);
    return articleMemoryCache.get(id)!;
  }

  // 2. Check L2 Supabase Cache (Save Once, Use Forever)
  if (isSupabaseConfigured()) {
    try {
        const { data, error } = await supabase!
            .from('ai_articles_cache')
            .select('data')
            .eq('article_id', id)
            .single();
        
        if (data && !error) {
            console.log(`[Supabase Cache Hit] Article ${id}`);
            const content = data.data as EnhancedArticleContent;
            articleMemoryCache.set(id, content); // Hydrate memory cache
            return content;
        }
    } catch (e) {
        console.warn("Supabase cache check failed", e);
    }
  }

  const aiClient = getAI();
  if (!aiClient) throw new Error("API Key not configured");

  const prompt = `
    You are a senior journalist for News Pulse AI.
    Based on the following news headline and snippet, write a comprehensive news update.
    
    Headline: "${title}"
    Snippet: "${description}"
    
    Your Tasks (Must provide all):
    1. Expand this into a full article (approx 250 words). Be objective, professional, and journalistic (English).
    2. Write a short summary (max 50 words) in English.
    3. Translate the *Full Article* (from step 1) into Roman Urdu (Urdu language written in English script).
    4. Translate the *Full Article* (from step 1) into Urdu (proper Urdu script/Nastaliq).
    5. Translate the *Full Article* (from step 1) into Hindi (Devanagari script).
    6. Translate the *Full Article* (from step 1) into Telugu (Telugu script).
    
    Also provide a short summary for Roman Urdu, Urdu, Hindi, and Telugu as separate fields.
    
    Output strictly in JSON format matching the schema.
  `;

  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fullArticle: { type: Type.STRING },
            summaryShort: { type: Type.STRING },
            summaryRomanUrdu: { type: Type.STRING },
            summaryUrdu: { type: Type.STRING },
            summaryHindi: { type: Type.STRING },
            summaryTelugu: { type: Type.STRING },
            fullArticleRomanUrdu: { type: Type.STRING },
            fullArticleUrdu: { type: Type.STRING },
            fullArticleHindi: { type: Type.STRING },
            fullArticleTelugu: { type: Type.STRING },
          },
          required: [
            "fullArticle", "summaryShort", 
            "summaryRomanUrdu", "summaryUrdu", "summaryHindi", "summaryTelugu",
            "fullArticleRomanUrdu", "fullArticleUrdu", "fullArticleHindi", "fullArticleTelugu"
          ]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const content = JSON.parse(text) as EnhancedArticleContent;
    
    // 3. Save to Memory Cache
    articleMemoryCache.set(id, content);

    // 4. Save to Supabase (Async, fire and forget)
    if (isSupabaseConfigured()) {
        supabase!.from('ai_articles_cache')
            .upsert({ article_id: id, data: content }, { onConflict: 'article_id' })
            .then(({ error }) => {
                if (error) console.error("Failed to save article to Supabase", error);
                else console.log(`[Supabase Saved] Article ${id}`);
            });
    }
    
    return content;

  } catch (error) {
    console.error("Gemini Text Error:", error);
    // Fallback logic if AI fails
    return {
      fullArticle: description + "\n\n(AI Expansion currently unavailable. Please check back later.)",
      summaryShort: description,
      summaryRomanUrdu: "Maaf kijiye, abhi tarjuma dastiyab nahi hai.",
      summaryUrdu: "معاف کیجئے، ابھی ترجمہ دستیاب نہیں ہے۔",
      summaryHindi: "क्षमा करें, अनुवाद अभी उपलब्ध नहीं है।",
      summaryTelugu: "క్షమించండి, అనువాదం ప్రస్తుతం అందుబాటులో లేదు.",
      fullArticleRomanUrdu: description,
      fullArticleUrdu: description,
      fullArticleHindi: description,
      fullArticleTelugu: description
    };
  }
};

// --- Audio Generation (TTS) ---

export const generateNewsAudio = async (text: string): Promise<{ audioData: string }> => {
  // Simple hashing for cache key
  const cacheKey = btoa(unescape(encodeURIComponent(text.trim().slice(0, 100) + text.length))); 

  // 1. Check Memory Cache
  if (audioMemoryCache.has(cacheKey)) {
    console.log("[Audio Memory Cache Hit]");
    return { audioData: audioMemoryCache.get(cacheKey)! };
  }

  // 2. Check Supabase Cache
  if (isSupabaseConfigured()) {
      try {
          const { data, error } = await supabase!
              .from('ai_audio_cache')
              .select('audio_data')
              .eq('text_hash', cacheKey)
              .single();
          
          if (data && !error) {
              console.log("[Audio Supabase Cache Hit]");
              audioMemoryCache.set(cacheKey, data.audio_data);
              return { audioData: data.audio_data };
          }
      } catch (e) {
          console.warn("Supabase audio cache check failed", e);
      }
  }

  const aiClient = getAI();
  if (!aiClient) throw new Error("API Key not configured");

  // CRITICAL FIX: Aggressive text sanitization.
  const cleanText = text
    .replace(/https?:\/\/\S+/g, '') // Remove URLs completely
    .replace(/[*#_`~>\[\]\(\)]/g, '') // Remove all Markdown and bracket characters
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();

  if (!cleanText) {
      throw new Error("Audio generation failed: Text was empty after sanitization.");
  }

  const speechText = cleanText.slice(0, 500);

  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{
        parts: [{ text: speechText }]
      }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
        throw new Error("No audio data generated - Model may have refused content");
    }

    // 3. Save to Memory Cache
    audioMemoryCache.set(cacheKey, base64Audio);

    // 4. Save to Supabase (Async)
    if (isSupabaseConfigured()) {
        supabase!.from('ai_audio_cache')
            .upsert({ text_hash: cacheKey, audio_data: base64Audio }, { onConflict: 'text_hash' })
            .then(({ error }) => {
                if (error) console.error("Failed to save audio to Supabase", error);
                else console.log("[Supabase Saved] Audio Cache");
            });
    }

    return { audioData: base64Audio };

  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
};