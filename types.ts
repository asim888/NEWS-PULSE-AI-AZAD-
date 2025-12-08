
export enum Category {
  AZAD_STUDIO = 'Azad Studio',
  HYDERABAD = 'Hyderabad',
  TELANGANA = 'Telangana',
  INDIA = 'India',
  INTERNATIONAL = 'International',
  SPORTS = 'Sports',
  FOUNDERS = 'Founders',
  GALLERY = 'Gallery'
}

export interface Article {
  id: string;
  title: string;
  source: string;
  timestamp: string;
  imageUrl?: string;
  description: string;
  summaryShort?: string;
  descriptionRomanUrdu?: string;
  descriptionUrdu?: string;
  descriptionHindi?: string;
  descriptionTelugu?: string;
  content?: string;
  category: Category;
  url: string;
}

export interface EnhancedArticleContent {
  fullArticle: string;
  summaryShort: string;
  summaryRomanUrdu: string;
  summaryUrdu: string;
  summaryHindi: string;
  summaryTelugu: string;
  fullArticleRomanUrdu?: string;
  fullArticleUrdu?: string;
  fullArticleHindi?: string;
  fullArticleTelugu?: string;
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image: string;
}

export interface UserState {
  hasEntered: boolean;
  isPremium: boolean;
  viewedArticles: string[];
}

export type SubscriptionPlan = 'free' | 'trial' | 'premium';

export interface SubscriptionStatus {
    plan: SubscriptionPlan;
    expiry: number | null;
    autoRenew: boolean;
}

export interface ToastMessage {
    id: number;
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning';
}