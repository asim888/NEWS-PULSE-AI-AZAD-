import { GoogleGenAI, Type, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { EnhancedArticleContent } from "../types";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

let ai: GoogleGenAI | null = null;

const getAI = () => {
  if (!ai) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.error("CRITICAL ERROR: API_KEY is missing. AI features will fail.");
    }
    ai = new GoogleGenAI({ apiKey: apiKey || '' });
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
        case 'roman': return 'hi-IN'; // Roman Urdu often reads better with Hindi voice
        default: return 'en-IN';
    }
};

const parseJSONSafe = (text: string): any => {
    try {
        return JSON.parse(text);
    } catch (e) {
        // Strip markdown code blocks
        const match = text.match(/```json([\s\S]*?)```/);
        if (match) {
            try { return JSON.parse(match[1]); } catch (e2) {}
        }
        // Try finding the outermost JSON object
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
             try { return JSON.parse(text.substring(start, end + 1)); } catch (e3) {}
        }
        throw new Error("Failed to parse JSON response");
    }
};

export const enhanceArticle = async (
  id: string,
  title: string,
  description: string
): Promise<EnhancedArticleContent> => {
  if (articleMemoryCache.has(id)) {
    return articleMemoryCache.get(id)!;
  }

  if (isSupabaseConfigured()) {
    try {
        const { data, error } = await supabase!
            .from('ai_articles_cache')
            .select('data')
            .eq('article_id', id)
            .single();
        
        if (data && !error) {
            const content = data.data as EnhancedArticleContent;
            articleMemoryCache.set(id, content);
            return content;
        }
    } catch (e) {}
  }

  const prompt = `
    Task: News Enhancement.
    Source: "${title}" - "${description}"
    
    1. WRITE A FULL ARTICLE (400-500 words): Professional journalist style.
    2. SUMMARIZE (50 words): Key facts.
    3. TRANSLATE the *Full Article* into:
       - Roman Urdu
       - Urdu (Nastaliq)
       - Hindi
       - Telugu
    
    Output JSON only:
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
  const aiClient = getAI();
  
  // Safety settings to prevent blocking of sensitive news topics
  const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
  ];

  // ATTEMPT 1: Strict JSON Schema Mode
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
        },
        safetySettings: safetySettings
      }
    });

    if (response.text) {
        content = JSON.parse(response.text) as EnhancedArticleContent;
    }
  } catch (error) {
      console.warn("Gemini Primary Translation Failed, attempting fallback...", error);
  }

  // ATTEMPT 2: Relaxed Text Mode (Fallback if Schema fails)
  if (!content) {
      try {
          const fallbackPrompt = prompt + "\n\nCRITICAL: Return ONLY valid JSON. Do not use Markdown formatting.";
          const response = await aiClient.models.generateContent({
              model: "gemini-2.5-flash",
              contents: fallbackPrompt,
              config: {
                  safetySettings: safetySettings
              }
          });
          
          if (response.text) {
              content = parseJSONSafe(response.text) as EnhancedArticleContent;
          }
      } catch (fallbackError) {
          console.error("Gemini Fallback Translation Failed", fallbackError);
      }
  }

  if (content) {
      articleMemoryCache.set(id, content);
      if (isSupabaseConfigured()) {
          supabase!.from('ai_articles_cache')
              .upsert({ article_id: id, data: content }, { onConflict: 'article_id' })
              .then(() => {});
      }
      return content;
  } else {
      // FINAL FALLBACK: Return Minimal Data so app doesn't crash
      return {
          fullArticle: description || "Content currently unavailable. Please check back later.",
          summaryShort: description || "Summary unavailable.",
          summaryRomanUrdu: "Tarjuma dastiyab nahi hai.",
          summaryUrdu: "ترجمہ دستیاب نہیں ہے۔",
          summaryHindi: "अनुवाद उपलब्ध नहीं है।",
          summaryTelugu: "అనువాదం అందుబాటులో లేదు.",
          fullArticleRomanUrdu: description || "",
          fullArticleUrdu: "",
          fullArticleHindi: "",
          fullArticleTelugu: ""
      };
  }
};

export const generateNewsAudio = async (text: string): Promise<{ audioData: string }> => {
  // Create a shorter key for cache to avoid issues with long text
  const textSample = text.trim().slice(0, 50) + text.length;
  const cacheKey = btoa(unescape(encodeURIComponent(textSample))); 

  if (audioMemoryCache.has(cacheKey)) {
    return { audioData: audioMemoryCache.get(cacheKey)! };
  }

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

  // Strict Cleaning for TTS
  const cleanText = text
    .replace(/https?:\/\/\S+/g, '') // Remove URLs
    .replace(/[*#_`~>\[\]\(\)]/g, '') // Remove Markdown
    .replace(/\s+/g, ' ') // Clean spacing
    .replace(/"/g, '') // Remove quotes that might confuse some parsers
    .trim();

  if (!cleanText) throw new Error("Audio generation failed: Empty text");

  // Safety limit for TTS model (approx 4000 chars)
  const speechText = cleanText.slice(0, 4000);
  let base64Audio: string | null = null;

  try {
      const aiClient = getAI();
      
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
                    prebuiltVoiceConfig: { voiceName: 'Fenrir' } 
                }
            },
            safetySettings: safetySettings
        }
      });
      
      base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
      console.warn("Gemini TTS Failed", error);
      // We throw here so the UI can catch it and trigger the Device TTS fallback
      throw new Error("Gemini TTS API Error"); 
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
      throw new Error("TTS generation failed (No Audio Data).");
  }
};
