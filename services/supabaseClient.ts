
import { createClient } from '@supabase/supabase-js';
import { getEnv } from '../utils/env';

// Access environment variables securely
const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY');

// Create a single supabase client for interacting with your database
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

// Helper to check if supabase is configured
export const isSupabaseConfigured = () => {
    return !!supabase;
};

// Types for your specific tables
export interface TelegramPost {
    id: number;
    message: string;
    media_url?: string; // Optional image/video
    created_at: string;
    views?: number;
}

export interface AiArticleCache {
    article_id: string; // Hashed ID
    data: any; // JSON content (EnhancedArticleContent)
    created_at?: string;
}

export interface AiAudioCache {
    text_hash: string;
    audio_data: string; // Base64
    created_at?: string;
}
