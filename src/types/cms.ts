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
  /** Whether this is a system (mandatory) page that cannot be deleted. */
  is_system: boolean;
  /** SEO meta description. */
  meta_description: string | null;
  /** Display order among sibling pages. */
  sort_order: number;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp. */
  updated_at: string;
}

/** A navigation menu item for a festival site. */
export interface CmsNavItem {
  id: string;
  festival_id: string;
  parent_id: string | null;
  label: string;
  link_type: 'page' | 'internal' | 'external';
  target: string;
  sort_order: number;
  is_visible: boolean;
  open_new_tab: boolean;
  created_at: string;
  updated_at: string;
  children?: CmsNavItem[];
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
  cta2_label?: string;
  cta2_url?: string;
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

/** Content for the "image_text" block type (image + text side by side). */
export interface ImageTextBlockContent {
  image_url: string;
  alt_text?: string;
  /** Position of the image relative to text. */
  image_position: 'left' | 'right';
  title?: string;
  body: string;
  /** Vertical alignment. */
  vertical_align?: 'top' | 'center' | 'bottom';
}

/** Content for the "cta" block type (call to action). */
export interface CtaBlockContent {
  title: string;
  subtitle?: string;
  button_label: string;
  button_url: string;
  background_color?: string;
  text_color?: string;
  /** Second button (optional). */
  button2_label?: string;
  button2_url?: string;
}

/** Content for the "testimonial" block type. */
export interface TestimonialBlockContent {
  items: Array<{
    quote: string;
    author_name: string;
    author_role?: string;
    avatar_url?: string;
    rating?: number;
  }>;
}

/** Content for the "pricing_table" block type. */
export interface PricingTableBlockContent {
  plans: Array<{
    name: string;
    price: string;
    period?: string;
    description?: string;
    features: string[];
    button_label?: string;
    button_url?: string;
    is_highlighted?: boolean;
  }>;
}

/** Content for the "icon_box" block type. */
export interface IconBoxBlockContent {
  items: Array<{
    icon: string;
    title: string;
    description: string;
    link_url?: string;
  }>;
  columns?: number;
}

/** Content for the "team_member" block type. */
export interface TeamMemberBlockContent {
  members: Array<{
    name: string;
    role: string;
    photo_url?: string;
    bio?: string;
    social_links?: Record<string, string>;
  }>;
}

/** Content for the "stats" block type (key figures / counters). */
export interface StatsBlockContent {
  items: Array<{
    value: string;
    label: string;
    prefix?: string;
    suffix?: string;
  }>;
}

/** Content for the "separator" block type. */
export interface SeparatorBlockContent {
  style: 'solid' | 'dashed' | 'dotted' | 'double';
  color?: string;
  width?: string;
}

/** Content for the "spacer" block type. */
export interface SpacerBlockContent {
  height: number;
}

/** Content for the "alert" block type. */
export interface AlertBlockContent {
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  dismissible?: boolean;
}

/** Content for the "tabs" block type. */
export interface TabsBlockContent {
  tabs: Array<{
    title: string;
    body: string;
  }>;
}

/** Content for the "logo_carousel" block type. */
export interface LogoCarouselBlockContent {
  logos: Array<{
    image_url: string;
    alt_text?: string;
    link_url?: string;
  }>;
  title?: string;
}

/** Content for the "button" block type. */
export interface ButtonBlockContent {
  label: string;
  url: string;
  style: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'center' | 'right';
  open_new_tab?: boolean;
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
  image_text: ImageTextBlockContent;
  cta: CtaBlockContent;
  testimonial: TestimonialBlockContent;
  pricing_table: PricingTableBlockContent;
  icon_box: IconBoxBlockContent;
  team_member: TeamMemberBlockContent;
  stats: StatsBlockContent;
  separator: SeparatorBlockContent;
  spacer: SpacerBlockContent;
  alert: AlertBlockContent;
  tabs: TabsBlockContent;
  logo_carousel: LogoCarouselBlockContent;
  button: ButtonBlockContent;
}

/**
 * A strongly-typed CMS block where `content` is narrowed
 * to the shape matching `block_type`.
 */
export interface TypedCmsBlock<T extends BlockType = BlockType> extends Omit<CmsBlock, 'content' | 'block_type'> {
  block_type: T;
  content: T extends keyof BlockContentMap ? BlockContentMap[T] : Record<string, unknown>;
}
