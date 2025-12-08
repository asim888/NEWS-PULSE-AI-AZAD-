
import { Category, Article } from '../types';
import { RSS_FEEDS } from '../constants';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const CACHE_PREFIX = 'news_pulse_cache_';
const CACHE_DURATION = 5 * 60 * 1000; // 5 Minutes for fast Breaking News

const generateId = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'rss_' + Math.abs(hash).toString(36);
};

export const fetchGalleryPosts = async (): Promise<Article[]> => {
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase!
                .from('gallery_posts')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (data && !error) {
                return data.map((post: any) => ({
                    id: `gal_${post.id}`,
                    title: post.title || "Gallery Post",
                    source: 'Azad Gallery',
                    timestamp: new Date(post.created_at).toLocaleDateString(),
                    description: post.description || "",
                    category: Category.GALLERY,
                    url: '#',
                    imageUrl: post.media_url,
                    descriptionRomanUrdu: post.description
                }));
            }
        } catch (e) {
            console.warn("Failed to fetch Gallery posts", e);
        }
    }
    return [];
};

export const addGalleryPost = async (post: { title: string, description: string, media_url: string }) => {
    if (!isSupabaseConfigured()) throw new Error("Database not connected");
    
    const { data, error } = await supabase!
        .from('gallery_posts')
        .insert([
            {
                title: post.title,
                description: post.description,
                media_url: post.media_url
            }
        ])
        .select();
    
    if (error) throw error;
    return data;
};

export const fetchNewsForCategory = async (category: Category): Promise<Article[]> => {
    if (category === Category.AZAD_STUDIO) {
        if (!isSupabaseConfigured()) {
            console.warn("[Azad Studio] Supabase URL or Key missing. Cannot fetch posts.");
            return [];
        }

        try {
            console.log("[Azad Studio] Fetching posts from Supabase telegram_posts table...");
            const { data, error } = await supabase!
                .from('telegram_posts')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (error) {
                console.error("[Azad Studio] Supabase Query Error:", error.message);
                return [];
            }

            if (data && data.length > 0) {
                console.log(`[Azad Studio] Successfully fetched ${data.length} posts.`);
                return data.map((post: any) => {
                    const rawMsg = post.message || "";
                    const titleLine = rawMsg.split('\n')[0];
                    const title = titleLine.length > 60 
                        ? titleLine.substring(0, 60) + "..." 
                        : (titleLine || "Azad Studio Update");

                    return {
                        id: `tg_${post.id}`,
                        title: title,
                        source: 'Azad Studio Live',
                        timestamp: post.created_at 
                            ? new Date(post.created_at).toLocaleDateString() + ' ' + new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                            : 'Just Now',
                        description: rawMsg, 
                        category: Category.AZAD_STUDIO,
                        url: '#',
                        imageUrl: post.media_url,
                        descriptionRomanUrdu: rawMsg 
                    };
                });
            } else {
                console.log("[Azad Studio] No posts found in database.");
                return [];
            }
        } catch (e) {
            console.error("[Azad Studio] Unexpected fetch error:", e);
            return [];
        }
    }

    if (category === Category.GALLERY) {
        return fetchGalleryPosts();
    }

    let supabaseStaleData: Article[] = [];
    let localStaleData: Article[] = [];

    // 1. Supabase RSS Cache
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase!
                .from('rss_feed_cache')
                .select('*')
                .eq('category', category)
                .single();

            if (data && !error && data.articles && data.articles.length > 0) {
                const lastUpdate = new Date(data.updated_at).getTime();
                const isFresh = (Date.now() - lastUpdate) < CACHE_DURATION;
                
                if (isFresh) {
                    return data.articles;
                } else {
                    supabaseStaleData = data.articles;
                }
            }
        } catch (e) {
            console.warn(`Supabase RSS cache check failed for ${category}`, e);
        }
    }

    // 2. Local Storage Cache
    const cacheKey = CACHE_PREFIX + category;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
        try {
            const parsed = JSON.parse(cachedData);
            if (Date.now() - parsed.timestamp < CACHE_DURATION) {
                return parsed.articles;
            }
            localStaleData = parsed.articles;
        } catch (e) {
            console.error("Cache parse error", e);
        }
    }

    // 3. Live Fetch
    const feedUrls = RSS_FEEDS[category];
    if (!feedUrls || feedUrls.length === 0) return [];

    const fetchPromises = feedUrls.map(async (url) => {
        const proxies = [
            { url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, type: 'json' },
            { url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`, type: 'text' },
            { url: `https://corsproxy.io/?${encodeURIComponent(url)}`, type: 'text' },
            { url: `https://thingproxy.freeboard.io/fetch/${url}`, type: 'text' }
        ];

        for (const proxy of proxies) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000); // Shorter timeout (6s)

                const response = await fetch(proxy.url, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!response.ok) throw new Error(`Proxy status ${response.status}`);

                let rssContent = "";
                if (proxy.type === 'json') {
                    const data = await response.json();
                    rssContent = data.contents;
                } else {
                    rssContent = await response.text();
                }

                if (!rssContent) continue;

                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(rssContent, "text/xml");
                if (xmlDoc.querySelector("parsererror")) continue;

                const items = xmlDoc.querySelectorAll("item");
                if (items.length === 0) continue;

                const sourceName = new URL(url).hostname.replace('www.', '').replace('feeds.', '').split('.')[0].toUpperCase();

                return Array.from(items).map(item => {
                    const title = item.querySelector("title")?.textContent || "No Title";
                    const link = item.querySelector("link")?.textContent || "";
                    const pubDate = item.querySelector("pubDate")?.textContent || "";
                    const rawDescription = item.querySelector("description")?.textContent || "";
                    
                    const tempDiv = document.createElement("div");
                    tempDiv.innerHTML = rawDescription;
                    const cleanDescription = tempDiv.textContent?.trim().substring(0, 200) + "..." || "";

                    let imageUrl = '';
                    const mediaContent = item.getElementsByTagName("media:content")[0];
                    if (mediaContent) imageUrl = mediaContent.getAttribute("url") || '';
                    if (!imageUrl) {
                        const imgMatch = rawDescription.match(/<img[^>]+src="([^">]+)"/);
                        if (imgMatch) imageUrl = imgMatch[1];
                    }

                    return {
                        id: generateId(link),
                        title: title,
                        source: sourceName,
                        timestamp: pubDate ? new Date(pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
                        description: cleanDescription,
                        category: category,
                        url: link,
                        imageUrl: imageUrl 
                    };
                });
            } catch (e) {
               // Next proxy
            }
        }
        return [];
    });

    try {
        const results = await Promise.all(fetchPromises);
        const allArticles = results.flat();

        const seenTitles = new Set();
        const uniqueArticles = allArticles.filter(article => {
            const normalizedTitle = article.title.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (seenTitles.has(normalizedTitle)) return false;
            seenTitles.add(normalizedTitle);
            return true;
        });

        if (uniqueArticles.length > 0) {
            localStorage.setItem(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                articles: uniqueArticles
            }));

            if (isSupabaseConfigured()) {
                supabase!.from('rss_feed_cache')
                    .upsert({ 
                        category: category, 
                        articles: uniqueArticles,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'category' })
                    .then(({ error }) => {
                        if (error) console.error(`[Supabase RSS] Failed update`, error);
                    });
            }

            return uniqueArticles;
        }
    } catch (err) {
        console.warn("RSS Network fetch failed", err);
    }

    // 4. Fallback (Stale)
    if (supabaseStaleData.length > 0) return supabaseStaleData;
    if (localStaleData.length > 0) return localStaleData;

    return [];
};