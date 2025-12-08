import { GoogleGenAI, Type, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { EnhancedArticleContent } from "../types";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { getEnv } from "../utils/env";

let ai: GoogleGenAI | null = null;

const getAI = () => {
  if (!ai) {
    // Guideline: API key must be obtained exclusively from process.env.API_KEY
    // Guideline: Assume it is pre-configured and accessible.
    const key = process.env.API_KEY || getEnv('API_KEY');
    if (key) {
        ai = new GoogleGenAI({ apiKey: key });
    }
  }
  return ai;
};

const articleMemoryCache = new Map<string, EnhancedArticleContent>();
const audioMemoryCache = new Map<string, string>();

export const getDeviceVoiceLang = (tab: string): string => {
    switch (tab) {
        case 'urdu': return 'ur-IN';
        case 'hindi': return 'hi-IN';
        case 'telugu': return 'te-IN';
        default: return 'en-IN';
    }
};

export const enhanceArticle = async (
  id: string,
  title: string,
  description: string
): Promise<EnhancedArticleContent> => {
  // 1. Check Memory Cache (Fastest)
  if (articleMemoryCache.has(id)) {
    return articleMemoryCache.get(id)!;
  }

  // 2. Check Supabase Cache (Fast)
  if (isSupabaseConfigured()) {
    try {
        const { data, error } = await supabase!
            .from('ai_articles_cache')
            .select('data')
            .eq('article_id', id)
            .single();
        
        if (data && !error) {
            console.log("[GeminiService] Article Cache Hit");
            const content = data.data as EnhancedArticleContent;
            articleMemoryCache.set(id, content);
            return content;
        }
    } catch (e) {
        // Silent fail on cache miss
    }
  }

  // 3. Generate with Gemini (Optimized Prompt)
  const prompt = `
    Context: News Aggregation.
    Source: "${title}" - "${description}"
    
    Task:
    1. WRITE A FULL ARTICLE (300-400 words): Expansive, professional, journalist style. Include context and potential impact.
    2. SUMMARIZE (50 words): Key facts only.
    3. TRANSLATE the *Full Article* into:
       - Roman Urdu (Urdu in English script)
       - Urdu (Nastaliq script)
       - Hindi (Devanagari)
       - Telugu (Telugu script)
    
    Output strictly valid JSON:
    {
      "fullArticle": "string",
      "summaryShort": "string",
      "summaryRomanUrdu": "string",
      "summaryUrdu": "string",
      "summaryHindi": "string",
      "summaryTelugu": "string",
      "fullArticleRomanUrdu": "string",
      "fullArticleUrdu": "string",
      "fullArticleHindi": "string",
      "fullArticleTelugu": "string"
    }
  `;

  let content: EnhancedArticleContent | null = null;

  try {
    const aiClient = getAI();
    if (!aiClient) throw new Error("Gemini API Key missing");

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
    if (text) {
        content = JSON.parse(text) as EnhancedArticleContent;
    }
  } catch (error) {
      console.error("Gemini Generation Error:", error);
  }

  // 4. Handle Result
  if (content) {
      // Success: Cache and Return
      articleMemoryCache.set(id, content);
      
      // Fire and forget cache update (don't await) to speed up UI return
      if (isSupabaseConfigured()) {
          supabase!.from('ai_articles_cache')
              .upsert({ article_id: id, data: content }, { onConflict: 'article_id' })
              .then(() => {});
      }
      return content;
  } else {
      // Fallback
      return {
          fullArticle: description + "\n\n(Full article generation unavailable at this moment.)",
          summaryShort: description,
          summaryRomanUrdu: "Tarjuma dastiyab nahi hai.",
          summaryUrdu: "ترجمہ دستیاب نہیں ہے۔",
          summaryHindi: "अनुवाद उपलब्ध नहीं है।",
          summaryTelugu: "అనువాదం అందుబాటులో లేదు.",
          fullArticleRomanUrdu: description,
          fullArticleUrdu: description,
          fullArticleHindi: description,
          fullArticleTelugu: description
      };
  }
};

export const generateNewsAudio = async (text: string): Promise<{ audioData: string }> => {
  const cacheKey = btoa(unescape(encodeURIComponent(text.trim().slice(0, 100) + text.length))); 

  // 1. Memory Cache
  if (audioMemoryCache.has(cacheKey)) {
    return { audioData: audioMemoryCache.get(cacheKey)! };
  }

  // 2. Supabase Cache
  if (isSupabaseConfigured()) {
      try {
          const { data, error } = await supabase!
              .from('ai_audio_cache')
              .select('audio_data')
              .eq('text_hash', cacheKey)
              .single();
          
          if (data && !error) {
              audioMemoryCache.set(cacheKey, data.audio_data);
              return { audioData: data.audio_data };
          }
      } catch (e) {}
  }

  const cleanText = text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*#_`~>\[\]\(\)]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) throw new Error("Audio generation failed: Empty text");

  // Increased limit for full article reading
  const speechText = cleanText.slice(0, 4000);
  let base64Audio: string | null = null;

  try {
      const aiClient = getAI();
      if (!aiClient) throw new Error("Gemini API Key missing");

      // BLOCK_NONE is crucial for news content
      const safetySettings = [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
      ];

      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: speechText }] }],
        config: {
            responseModalities: [Modality.AUDIO], 
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Fenrir' } // Deeper news voice
                }
            },
            safetySettings: safetySettings
        }
      });
      
      base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
      console.warn("Gemini TTS Failed", error);
  }

  if (base64Audio) {
      audioMemoryCache.set(cacheKey, base64Audio);
      if (isSupabaseConfigured()) {
          supabase!.from('ai_audio_cache')
              .upsert({ text_hash: cacheKey, audio_data: base64Audio }, { onConflict: 'text_hash' })
              .then(() => {});
      }
      return { audioData: base64Audio };
  } else {
      throw new Error("TTS generation failed.");
  }
};