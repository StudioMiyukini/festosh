/**
 * CMS page and block types for the Festosh page builder.
 */

import type { BlockType } from './enums';

/**
 * A CMS page belonging to a festival.
 * Pages are composed of ordered blocks.
 */
export interface CmsPage {
  id: string;
  festival_id: string;
  /** URL-safe identifier, unique within the festival. */
  slug: string;
  title: string;
  /** Whether the page is visible to the public. */
  is_published: boolean;
  /** Whether this page serves as the festival homepage. */
  is_homepage: boolean;
  /** SEO meta description. */
  meta_description: string | null;
  /** Display order among sibling pages. */
  sort_order: number;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp. */
  updated_at: string;
}

/**
 * A content block within a CMS page.
 * The `content` and `settings` payloads vary by block type.
 */
export interface CmsBlock {
  id: string;
  page_id: string;
  /** Discriminator that determines the content/settings shape. */
  block_type: BlockType;
  /** Block-specific content data. */
  content: Record<string, unknown>;
  /** Block-specific display settings. */
  settings: Record<string, unknown>;
  /** Display order within the page. */
  sort_order: number;
  /** Whether the block is rendered on the public page. */
  is_visible: boolean;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp. */
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Typed content payloads for each block type
// ---------------------------------------------------------------------------

/** Content for the "hero" block type. */
export interface HeroBlockContent {
  title: string;
  subtitle?: string;
  background_image_url?: string;
  cta_label?: string;
  cta_url?: string;
  overlay_opacity?: number;
}

/** Content for the "text" block type. */
export interface TextBlockContent {
  /** Rich-text HTML or Markdown body. */
  body: string;
}

/** Content for the "image" block type. */
export interface ImageBlockContent {
  image_url: string;
  alt_text?: string;
  caption?: string;
  link_url?: string;
}

/** Content for the "gallery" block type. */
export interface GalleryBlockContent {
  images: Array<{
    image_url: string;
    alt_text?: string;
    caption?: string;
  }>;
}

/** Content for the "video" block type. */
export interface VideoBlockContent {
  /** URL to the video (YouTube, Vimeo, or direct). */
  video_url: string;
  /** Optional poster / thumbnail image. */
  poster_url?: string;
  autoplay?: boolean;
}

/** Content for the "map" block type. */
export interface MapBlockContent {
  latitude: number;
  longitude: number;
  zoom?: number;
  marker_label?: string;
}

/** Content for the "schedule" block type. */
export interface ScheduleBlockContent {
  /** Optional edition id to scope the schedule. */
  edition_id?: string;
  /** Filter events by category. */
  categories?: string[];
  /** Layout variant. */
  display_mode?: 'timeline' | 'grid' | 'list';
}

/** Content for the "exhibitor_list" block type. */
export interface ExhibitorListBlockContent {
  /** Optional edition id to scope the list. */
  edition_id?: string;
  /** Show only approved exhibitors. */
  approved_only?: boolean;
  /** Layout variant. */
  display_mode?: 'grid' | 'list';
}

/** Content for the "contact_form" block type. */
export interface ContactFormBlockContent {
  /** Email address that receives submissions. */
  recipient_email: string;
  /** Fields to display on the form. */
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'email' | 'textarea' | 'select';
    required?: boolean;
    options?: string[];
  }>;
  success_message?: string;
}

/** Content for the "faq" block type. */
export interface FaqBlockContent {
  items: Array<{
    question: string;
    answer: string;
  }>;
}

/** Content for the "countdown" block type. */
export interface CountdownBlockContent {
  /** ISO 8601 datetime to count down to. */
  target_date: string;
  label?: string;
  /** Whether to hide the block once the date has passed. */
  hide_after_expiry?: boolean;
}

/** Content for the "custom_html" block type. */
export interface CustomHtmlBlockContent {
  /** Raw HTML to render. */
  html: string;
}

/** Union of all typed block content payloads, keyed by block type. */
export interface BlockContentMap {
  hero: HeroBlockContent;
  text: TextBlockContent;
  image: ImageBlockContent;
  gallery: GalleryBlockContent;
  video: VideoBlockContent;
  map: MapBlockContent;
  schedule: ScheduleBlockContent;
  exhibitor_list: ExhibitorListBlockContent;
  contact_form: ContactFormBlockContent;
  faq: FaqBlockContent;
  countdown: CountdownBlockContent;
  custom_html: CustomHtmlBlockContent;
}

/**
 * A strongly-typed CMS block where `content` is narrowed
 * to the shape matching `block_type`.
 */
export interface TypedCmsBlock<T extends BlockType = BlockType> extends Omit<CmsBlock, 'content' | 'block_type'> {
  block_type: T;
  content: T extends keyof BlockContentMap ? BlockContentMap[T] : Record<string, unknown>;
}
