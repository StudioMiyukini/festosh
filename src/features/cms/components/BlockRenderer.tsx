import { useState, useEffect, useCallback, useRef } from 'react';
import DOMPurify from 'dompurify';
import {
  ChevronDown,
  CalendarDays,
  Users,
  Send,
  Play,
  MapPin,
  Star,
  Check,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  Quote,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
  Github,
  Globe,
  Mail,
  ArrowRight,
} from 'lucide-react';
import type { CmsBlock, BlockSettings } from '@/types/cms';
import type {
  HeroBlockContent,
  HeadingBlockContent,
  TextBlockContent,
  ImageBlockContent,
  GalleryBlockContent,
  VideoBlockContent,
  MapBlockContent,
  ContactFormBlockContent,
  FaqBlockContent,
  CountdownBlockContent,
  CustomHtmlBlockContent,
  ImageTextBlockContent,
  CtaBlockContent,
  TestimonialBlockContent,
  PricingTableBlockContent,
  IconBoxBlockContent,
  TeamMemberBlockContent,
  StatsBlockContent,
  SeparatorBlockContent,
  SpacerBlockContent,
  AlertBlockContent,
  TabsBlockContent,
  AccordionBlockContent,
  LogoCarouselBlockContent,
  ButtonBlockContent,
  AnimatedHeadingBlockContent,
  BlockquoteBlockContent,
  SocialIconsBlockContent,
  ProgressBlockContent,
  FlipBoxBlockContent,
  PriceListBlockContent,
  BlockStyle,
} from '@/types/cms';
import { StyledSection } from './StyledSection';

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function HeroBlock({ content, style }: { content: HeroBlockContent; style?: BlockStyle }) {
  const opacity = content.overlay_opacity ?? 0.5;
  // The hero has its own background image semantics — if the universal style
  // doesn't set a background, fall back to the legacy `content.background_image_url`.
  const heroStyle: BlockStyle | undefined = style?.background_type
    ? style
    : content.background_image_url
      ? {
          ...style,
          background_type: 'image' as const,
          background_image_url: content.background_image_url,
          background_overlay_color: '#000000',
          background_overlay_opacity: opacity,
        }
      : style;

  return (
    <StyledSection
      style={heroStyle}
      defaultPaddingY="py-20"
      defaultPaddingX="px-4 sm:px-6 lg:px-8"
      contain={false}
      className="flex min-h-[400px] items-center justify-center overflow-hidden"
    >
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <h2
          className={`text-4xl font-bold tracking-tight sm:text-5xl ${
            content.background_image_url ? 'text-white' : 'text-foreground'
          }`}
        >
          {content.title}
        </h2>
        {content.subtitle && (
          <p
            className={`mt-4 text-lg ${
              content.background_image_url
                ? 'text-white/80'
                : 'text-muted-foreground'
            }`}
          >
            {content.subtitle}
          </p>
        )}
        {(content.cta_label || content.cta2_label) && (
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {content.cta_label && content.cta_url && (
              <a
                href={content.cta_url}
                className="inline-block rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {content.cta_label}
              </a>
            )}
            {content.cta2_label && content.cta2_url && (
              <a
                href={content.cta2_url}
                className={`inline-block rounded-md border px-6 py-3 text-sm font-medium transition-colors ${
                  content.background_image_url
                    ? 'border-white/50 text-white hover:bg-white/10'
                    : 'border-border text-foreground hover:bg-accent'
                }`}
              >
                {content.cta2_label}
              </a>
            )}
          </div>
        )}
      </div>
    </StyledSection>
  );
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

function TextBlock({ content, style }: { content: TextBlockContent & { html?: string }; style?: BlockStyle }) {
  // Editors historically wrote either `body` (festival CMS) or `html` (the
  // exhibitor CMS editor). Accept both so existing content keeps rendering.
  const raw = content.body || content.html || '';
  return (
    <StyledSection style={style} defaultPaddingY="py-12">
      <div
        className="prose prose-neutral mx-auto max-w-3xl dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(raw) }}
      />
    </StyledSection>
  );
}

// ---------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------

function ImageBlock({ content, style }: { content: ImageBlockContent; style?: BlockStyle }) {
  const radius = style?.border_radius != null ? `${style.border_radius}px` : undefined;
  const img = (
    <img
      src={content.image_url}
      alt={content.alt_text ?? ''}
      className="h-auto w-full"
      style={{ borderRadius: radius ?? '0.5rem' }}
    />
  );

  return (
    <StyledSection style={style} defaultPaddingY="py-12">
      <figure className="mx-auto max-w-4xl">
        {content.link_url ? (
          <a href={content.link_url} target="_blank" rel="noopener noreferrer">
            {img}
          </a>
        ) : (
          img
        )}
        {content.caption && (
          <figcaption className="mt-3 text-center text-sm text-muted-foreground">
            {content.caption}
          </figcaption>
        )}
      </figure>
    </StyledSection>
  );
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

function GalleryBlock({ content, style }: { content: GalleryBlockContent; style?: BlockStyle }) {
  const images = content.images ?? [];
  const radius = style?.border_radius != null ? `${style.border_radius}px` : undefined;

  return (
    <StyledSection style={style} defaultPaddingY="py-12">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 md:grid-cols-3">
        {images.map((image, index) => (
          <figure key={index} className="overflow-hidden" style={{ borderRadius: radius ?? '0.5rem' }}>
            <img
              src={image.image_url}
              alt={image.alt_text ?? ''}
              className="h-48 w-full object-cover transition-transform hover:scale-105"
            />
            {image.caption && (
              <figcaption className="mt-2 text-center text-xs text-muted-foreground">
                {image.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </StyledSection>
  );
}

// ---------------------------------------------------------------------------
// Video
// ---------------------------------------------------------------------------

function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/
  );
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return null;
}

function VideoBlock({ content }: { content: VideoBlockContent }) {
  const embedUrl = getEmbedUrl(content.video_url);

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {embedUrl ? (
        <div className="relative overflow-hidden rounded-lg pb-[56.25%]">
          <iframe
            src={embedUrl}
            title="Video"
            className="absolute inset-0 h-full w-full"
            sandbox="allow-same-origin allow-scripts allow-popups allow-presentation"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <video
          src={content.video_url}
          poster={content.poster_url}
          controls
          autoPlay={content.autoplay ?? false}
          className="w-full rounded-lg"
        >
          <track kind="captions" />
        </video>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Map (OpenStreetMap)
// ---------------------------------------------------------------------------

function MapBlock({ content }: { content: MapBlockContent }) {
  const zoom = content.zoom ?? 15;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${content.longitude - 0.01},${content.latitude - 0.01},${content.longitude + 0.01},${content.latitude + 0.01}&layer=mapnik&marker=${content.latitude},${content.longitude}`;

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {content.marker_label && (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{content.marker_label}</span>
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-border">
        <iframe
          src={src}
          title="Carte"
          width="100%"
          height="400"
          className="border-0"
          sandbox="allow-same-origin allow-scripts"
          loading="lazy"
          referrerPolicy="no-referrer"
          style={{ minHeight: `${Math.min(zoom * 30, 500)}px` }}
        />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Schedule (placeholder)
// ---------------------------------------------------------------------------

function ScheduleBlock() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-lg border border-border bg-muted/30 p-12 text-center">
        <CalendarDays className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">
          Programme de l'evenement
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Le programme complet sera affiche ici.
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Exhibitor list (placeholder)
// ---------------------------------------------------------------------------

function ExhibitorListBlock() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-lg border border-border bg-muted/30 p-12 text-center">
        <Users className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">
          Liste des exposants
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          La liste des exposants sera affichee ici.
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Contact form (UI only)
// ---------------------------------------------------------------------------

function ContactFormBlock({ content }: { content: ContactFormBlockContent }) {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-lg font-semibold text-foreground">
            {content.success_message ?? 'Merci ! Votre message a bien ete envoye.'}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-lg border border-border bg-card p-8"
      >
        <div>
          <label
            htmlFor="contact-name"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Nom
          </label>
          <input
            id="contact-name"
            type="text"
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Votre nom"
          />
        </div>

        <div>
          <label
            htmlFor="contact-email"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Email
          </label>
          <input
            id="contact-email"
            type="email"
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="votre@email.com"
          />
        </div>

        <div>
          <label
            htmlFor="contact-message"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Message
          </label>
          <textarea
            id="contact-message"
            rows={5}
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Votre message..."
          />
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Send className="h-4 w-4" />
          Envoyer
        </button>
      </form>
    </section>
  );
}

// ---------------------------------------------------------------------------
// FAQ (accordion)
// ---------------------------------------------------------------------------

function FaqBlock({ content, style }: { content: FaqBlockContent; style?: BlockStyle }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const items = content.items ?? [];

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <StyledSection style={style} defaultPaddingY="py-12">
      <div className="mx-auto max-w-3xl divide-y divide-border rounded-lg border border-border">
        {items.map((item, index) => (
          <div key={index}>
            <button
              type="button"
              onClick={() => toggle(index)}
              className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-muted/50"
            >
              <span className="text-sm font-medium text-foreground">
                {item.question}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                  openIndex === index ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openIndex === index && (
              <div className="px-6 pb-4 text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </StyledSection>
  );
}

// ---------------------------------------------------------------------------
// Countdown
// ---------------------------------------------------------------------------

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function computeTimeLeft(target: string): TimeLeft | null {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function CountdownBlock({ content }: { content: CountdownBlockContent }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() =>
    computeTimeLeft(content.target_date)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const tl = computeTimeLeft(content.target_date);
      setTimeLeft(tl);
      if (!tl) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [content.target_date]);

  if (!timeLeft) {
    if (content.hide_after_expiry) return null;
    return (
      <section className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6 lg:px-8">
        <p className="text-lg font-semibold text-foreground">
          {content.label ?? "L'evenement a commence !"}
        </p>
      </section>
    );
  }

  const units: { label: string; value: number }[] = [
    { label: 'Jours', value: timeLeft.days },
    { label: 'Heures', value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Secondes', value: timeLeft.seconds },
  ];

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6 lg:px-8">
      {content.label && (
        <p className="mb-6 text-lg font-semibold text-foreground">
          {content.label}
        </p>
      )}
      <div className="flex items-center justify-center gap-4">
        {units.map((unit) => (
          <div key={unit.label} className="flex flex-col items-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary text-2xl font-bold text-primary-foreground sm:h-20 sm:w-20 sm:text-3xl">
              {String(unit.value).padStart(2, '0')}
            </span>
            <span className="mt-2 text-xs font-medium text-muted-foreground">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Custom HTML
// ---------------------------------------------------------------------------

function CustomHtmlBlock({ content }: { content: CustomHtmlBlockContent }) {
  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.html || '') }} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Image + Text
// ---------------------------------------------------------------------------

function ImageTextBlock({ content, style }: { content: ImageTextBlockContent; style?: BlockStyle }) {
  const alignMap = { top: 'items-start', center: 'items-center', bottom: 'items-end' };
  const align = alignMap[content.vertical_align ?? 'center'];
  const imageFirst = (content.image_position ?? 'left') === 'left';
  const radius = style?.border_radius != null ? `${style.border_radius}px` : '0.5rem';

  const imageEl = (
    <div className="w-full md:w-1/2">
      <img
        src={content.image_url}
        alt={content.alt_text ?? ''}
        className="h-auto w-full"
        style={{ borderRadius: radius }}
      />
    </div>
  );

  const textEl = (
    <div className="w-full md:w-1/2">
      {content.title && (
        <h3 className="mb-3 text-2xl font-bold text-foreground" style={style?.heading_color ? { color: style.heading_color } : undefined}>
          {content.title}
        </h3>
      )}
      <div
        className="prose prose-neutral max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.body || '') }}
      />
    </div>
  );

  return (
    <StyledSection style={style} defaultPaddingY="py-12">
      <div className={`mx-auto flex max-w-5xl flex-col gap-8 md:flex-row ${align}`}>
        {imageFirst ? <>{imageEl}{textEl}</> : <>{textEl}{imageEl}</>}
      </div>
    </StyledSection>
  );
}

// ---------------------------------------------------------------------------
// CTA
// ---------------------------------------------------------------------------

function CtaBlock({ content, style }: { content: CtaBlockContent; style?: BlockStyle }) {
  // Legacy `content.background_color` / `content.text_color` still apply when
  // the universal style hasn't been configured. Universal wins when present.
  const effectiveStyle: BlockStyle = style?.background_type
    ? style!
    : {
        ...(style ?? {}),
        background_type: content.background_color ? 'color' as const : style?.background_type,
        background_color: content.background_color,
        text_color: style?.text_color ?? content.text_color,
      };

  return (
    <StyledSection
      style={effectiveStyle}
      defaultPaddingY="py-16"
      contain={false}
    >
      <div className="mx-auto max-w-3xl text-center">
        <h3 className="text-3xl font-bold">{content.title}</h3>
        {content.subtitle && (
          <p className="mt-4 text-lg opacity-80">{content.subtitle}</p>
        )}
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {content.button_label && (
            <a
              href={content.button_url}
              className="inline-block rounded-md bg-white px-6 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100"
            >
              {content.button_label}
            </a>
          )}
          {content.button2_label && content.button2_url && (
            <a
              href={content.button2_url}
              className="inline-block rounded-md border border-current px-6 py-3 text-sm font-medium transition-colors hover:bg-white/10"
            >
              {content.button2_label}
            </a>
          )}
        </div>
      </div>
    </StyledSection>
  );
}

// ---------------------------------------------------------------------------
// Testimonial
// ---------------------------------------------------------------------------

function TestimonialBlock({ content, style }: { content: TestimonialBlockContent; style?: BlockStyle }) {
  const items = content.items ?? [];

  return (
    <StyledSection style={style} defaultPaddingY="py-12">
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border bg-card p-6"
          >
            {item.rating != null && item.rating > 0 && (
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < item.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
                  />
                ))}
              </div>
            )}
            <blockquote className="text-sm italic leading-relaxed text-muted-foreground">
              &ldquo;{item.quote}&rdquo;
            </blockquote>
            <div className="mt-4 flex items-center gap-3">
              {item.avatar_url && (
                <img
                  src={item.avatar_url}
                  alt={item.author_name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {item.author_name}
                </p>
                {item.author_role && (
                  <p className="text-xs text-muted-foreground">
                    {item.author_role}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </StyledSection>
  );
}

// ---------------------------------------------------------------------------
// Pricing table
// ---------------------------------------------------------------------------

function PricingTableBlock({ content }: { content: PricingTableBlockContent }) {
  const plans = content.plans ?? [];

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className={`grid gap-6 ${plans.length <= 3 ? `md:grid-cols-${plans.length}` : 'md:grid-cols-3'}`}>
        {plans.map((plan, idx) => (
          <div
            key={idx}
            className={`rounded-xl border p-6 ${
              plan.is_highlighted
                ? 'border-primary bg-primary/5 shadow-lg'
                : 'border-border bg-card'
            }`}
          >
            <h4 className="text-lg font-semibold text-foreground">
              {plan.name}
            </h4>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">
                {plan.price}
              </span>
              {plan.period && (
                <span className="text-sm text-muted-foreground">
                  {plan.period}
                </span>
              )}
            </div>
            {plan.description && (
              <p className="mt-2 text-sm text-muted-foreground">
                {plan.description}
              </p>
            )}
            {plan.features.length > 0 && (
              <ul className="mt-4 space-y-2">
                {plan.features.map((f, fi) => (
                  <li
                    key={fi}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            )}
            {plan.button_label && plan.button_url && (
              <a
                href={plan.button_url}
                className={`mt-6 block rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
                  plan.is_highlighted
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-foreground hover:bg-accent'
                }`}
              >
                {plan.button_label}
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Icon Box
// ---------------------------------------------------------------------------

function IconBoxBlock({ content }: { content: IconBoxBlockContent }) {
  const items = content.items ?? [];
  const cols = content.columns ?? 3;
  const gridCols = cols === 2 ? 'md:grid-cols-2' : cols === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3';

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className={`grid gap-6 ${gridCols}`}>
        {items.map((item, idx) => {
          const inner = (
            <div className="rounded-xl border border-border bg-card p-6 text-center transition-shadow hover:shadow-md">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <span className="text-xl text-primary">{item.icon}</span>
              </div>
              <h4 className="text-base font-semibold text-foreground">
                {item.title}
              </h4>
              <p className="mt-2 text-sm text-muted-foreground">
                {item.description}
              </p>
            </div>
          );
          return item.link_url ? (
            <a key={idx} href={item.link_url} className="block no-underline">
              {inner}
            </a>
          ) : (
            <div key={idx}>{inner}</div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Team Member
// ---------------------------------------------------------------------------

function TeamMemberBlock({ content }: { content: TeamMemberBlockContent }) {
  const members = content.members ?? [];

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {members.map((m, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border bg-card p-5 text-center"
          >
            {m.photo_url ? (
              <img
                src={m.photo_url}
                alt={m.name}
                className="mx-auto mb-4 h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground">
                {m.name.charAt(0)}
              </div>
            )}
            <h4 className="text-sm font-semibold text-foreground">{m.name}</h4>
            <p className="text-xs text-muted-foreground">{m.role}</p>
            {m.bio && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {m.bio}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Stats / Key figures
// ---------------------------------------------------------------------------

function StatsBlock({ content, style }: { content: StatsBlockContent; style?: BlockStyle }) {
  const items = content.items ?? [];

  return (
    <StyledSection style={style} defaultPaddingY="py-12">
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 md:grid-cols-4">
        {items.map((item, idx) => (
          <div key={idx} className="text-center">
            <p className="text-3xl font-bold text-primary sm:text-4xl">
              {item.prefix}
              {item.value}
              {item.suffix}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
    </StyledSection>
  );
}

// ---------------------------------------------------------------------------
// Separator
// ---------------------------------------------------------------------------

function SeparatorBlock({ content }: { content: SeparatorBlockContent }) {
  return (
    <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <hr
        style={{
          borderStyle: content.style ?? 'solid',
          borderColor: content.color || undefined,
          width: content.width || '100%',
          margin: '0 auto',
        }}
        className="border-t-2"
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Spacer
// ---------------------------------------------------------------------------

function SpacerBlock({ content }: { content: SpacerBlockContent }) {
  return <div style={{ height: `${content.height ?? 40}px` }} />;
}

// ---------------------------------------------------------------------------
// Alert
// ---------------------------------------------------------------------------

const ALERT_STYLES: Record<string, { bg: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
  info: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', icon: Info },
  success: { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', icon: CheckCircle2 },
  warning: { bg: 'bg-yellow-50 dark:bg-yellow-950/30', border: 'border-yellow-200 dark:border-yellow-800', icon: AlertTriangle },
  error: { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', icon: XCircle },
};

function AlertBlock({ content }: { content: AlertBlockContent }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const style = ALERT_STYLES[content.type] ?? ALERT_STYLES.info;
  const Icon = style.icon;

  return (
    <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <div className={`relative flex gap-3 rounded-lg border p-4 ${style.bg} ${style.border}`}>
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="flex-1">
          {content.title && (
            <p className="font-semibold text-foreground">{content.title}</p>
          )}
          <p className="text-sm text-foreground/80">{content.message}</p>
        </div>
        {content.dismissible && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="shrink-0 rounded p-1 hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function TabsBlock({ content }: { content: TabsBlockContent }) {
  const tabs = content.tabs ?? [];
  const [activeTab, setActiveTab] = useState(0);

  if (tabs.length === 0) return null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex border-b border-border">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveTab(idx)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === idx
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.title}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <div
          className="prose prose-neutral max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(tabs[activeTab]?.body ?? '') }}
        />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Logo Carousel
// ---------------------------------------------------------------------------

function LogoCarouselBlock({ content }: { content: LogoCarouselBlockContent }) {
  const logos = content.logos ?? [];

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {content.title && (
        <h3 className="mb-8 text-center text-lg font-semibold text-foreground">
          {content.title}
        </h3>
      )}
      <div className="flex flex-wrap items-center justify-center gap-8">
        {logos.map((logo, idx) => {
          const img = (
            <img
              src={logo.image_url}
              alt={logo.alt_text ?? ''}
              className="h-12 w-auto max-w-[140px] object-contain grayscale transition-all hover:grayscale-0"
            />
          );
          return logo.link_url ? (
            <a key={idx} href={logo.link_url} target="_blank" rel="noopener noreferrer">
              {img}
            </a>
          ) : (
            <div key={idx}>{img}</div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

function ButtonBlock({ content }: { content: ButtonBlockContent }) {
  const alignClass = content.align === 'left' ? 'text-left' : content.align === 'right' ? 'text-right' : 'text-center';
  const sizeClass = content.size === 'sm' ? 'px-4 py-1.5 text-sm' : content.size === 'lg' ? 'px-8 py-3.5 text-base' : 'px-6 py-2.5 text-sm';

  const styleMap: Record<string, string> = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-muted text-foreground hover:bg-accent',
    outline: 'border border-border text-foreground hover:bg-accent',
    ghost: 'text-foreground hover:bg-accent',
  };
  const btnStyle = styleMap[content.style] ?? styleMap.primary;

  return (
    <section className={`mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 ${alignClass}`}>
      <a
        href={content.url}
        target={content.open_new_tab ? '_blank' : undefined}
        rel={content.open_new_tab ? 'noopener noreferrer' : undefined}
        className={`inline-block rounded-md font-medium transition-colors ${sizeClass} ${btnStyle}`}
      >
        {content.label}
      </a>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Heading — flexible big heading, like Elementor "Heading" widget
// ---------------------------------------------------------------------------

function HeadingBlock({ content, style }: { content: HeadingBlockContent; style?: BlockStyle }) {
  const level = content.level || 'h2';
  const alignClass = content.align === 'left' ? 'text-left' : content.align === 'right' ? 'text-right' : 'text-center';
  const sizeMap: Record<string, string> = {
    h1: 'text-4xl sm:text-5xl lg:text-6xl',
    h2: 'text-3xl sm:text-4xl lg:text-5xl',
    h3: 'text-2xl sm:text-3xl',
    h4: 'text-xl sm:text-2xl',
  };

  const renderText = () => {
    if (!content.highlight_word) return content.text;
    const parts = content.text.split(new RegExp(`(${content.highlight_word})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === content.highlight_word!.toLowerCase()
        ? <span key={i} className="text-primary">{part}</span>
        : part,
    );
  };

  // React 19 removed the global JSX namespace; resolve the tag via a switch
  // instead of a dynamic JSX element to keep TypeScript happy.
  const headingProps = {
    className: `font-bold tracking-tight text-foreground ${sizeMap[level]}`,
    style: style?.heading_color ? { color: style.heading_color } : undefined,
  };
  const heading =
    level === 'h1' ? <h1 {...headingProps}>{renderText()}</h1>
    : level === 'h3' ? <h3 {...headingProps}>{renderText()}</h3>
    : level === 'h4' ? <h4 {...headingProps}>{renderText()}</h4>
    : <h2 {...headingProps}>{renderText()}</h2>;

  return (
    <StyledSection style={style} defaultPaddingY="py-8">
      <div className={`${alignClass} mx-auto max-w-4xl`}>
        {heading}
        {content.subtitle && (
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">{content.subtitle}</p>
        )}
      </div>
    </StyledSection>
  );
}

// ---------------------------------------------------------------------------
// Animated heading — cycles through rotating words
// ---------------------------------------------------------------------------

function AnimatedHeadingBlock({ content, style }: { content: AnimatedHeadingBlockContent; style?: BlockStyle }) {
  const words = content.rotating_words?.length ? content.rotating_words : [''];
  const speed = content.speed_ms ?? 2500;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), speed);
    return () => clearInterval(id);
  }, [words.length, speed]);

  const anim = content.animation ?? 'fade';
  const animClass =
    anim === 'typing' ? 'animate-fade-in border-r-2 border-primary pr-1' :
    anim === 'slide' ? 'animate-slide-up' :
    'animate-fade-in';

  return (
    <StyledSection style={style} defaultPaddingY="py-12">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="flex flex-wrap items-center justify-center gap-x-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          {content.before_text && <span>{content.before_text}</span>}
          <span
            key={words[index]}
            className={`text-primary ${animClass}`}
          >
            {words[index]}
          </span>
          {content.after_text && <span>{content.after_text}</span>}
        </h2>
      </div>
    </StyledSection>
  );
}

// ---------------------------------------------------------------------------
// Blockquote
// ---------------------------------------------------------------------------

function BlockquoteBlock({ content, style }: { content: BlockquoteBlockContent; style?: BlockStyle }) {
  const variant = content.style || 'classic';
  const variantClass =
    variant === 'border' ? 'border-l-4 border-primary pl-6'
    : variant === 'background' ? 'rounded-xl bg-primary/5 p-8'
    : 'pl-6';

  return (
    <StyledSection style={style} defaultPaddingY="py-10">
      <figure className={`mx-auto max-w-3xl ${variantClass}`}>
        <Quote className="mb-3 h-8 w-8 text-primary/60" aria-hidden="true" />
        <blockquote className="text-xl font-medium leading-relaxed text-foreground sm:text-2xl">
          {content.quote}
        </blockquote>
        {(content.author || content.author_role) && (
          <figcaption className="mt-4 text-sm text-muted-foreground">
            {content.author && <span className="font-semibold text-foreground">{content.author}</span>}
            {content.author && content.author_role && <span> — </span>}
            {content.author_role && <span>{content.author_role}</span>}
          </figcaption>
        )}
      </figure>
    </StyledSection>
  );
}

// ---------------------------------------------------------------------------
// Social icons bar
// ---------------------------------------------------------------------------

const SOCIAL_ICONS: Record<string, typeof Facebook> = {
  facebook: Facebook, instagram: Instagram, twitter: Twitter, youtube: Youtube,
  linkedin: Linkedin, github: Github, website: Globe, email: Mail,
  // Lucide doesn't ship TikTok/Discord/Twitch/Pinterest — fallback to Globe with brand color.
  tiktok: Globe, discord: Globe, twitch: Globe, pinterest: Globe,
};

const SOCIAL_BRAND_COLORS: Record<string, string> = {
  facebook: '#1877f2', instagram: '#e4405f', twitter: '#1da1f2', youtube: '#ff0000',
  linkedin: '#0a66c2', github: '#181717', tiktok: '#000000', discord: '#5865f2',
  twitch: '#9146ff', pinterest: '#bd081c', website: '#6366f1', email: '#6b7280',
};

function SocialIconsBlock({ content, style }: { content: SocialIconsBlockContent; style?: BlockStyle }) {
  const items = content.items || [];
  const sizeClass = content.size === 'sm' ? 'h-8 w-8' : content.size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';
  const iconSize = content.size === 'sm' ? 'h-4 w-4' : content.size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  const shapeClass = content.shape === 'circle' ? 'rounded-full' : content.shape === 'rounded' ? 'rounded-md' : 'rounded-none';
  const alignClass = content.align === 'left' ? 'justify-start' : content.align === 'right' ? 'justify-end' : 'justify-center';

  return (
    <StyledSection style={style} defaultPaddingY="py-8">
      <div className={`flex flex-wrap items-center gap-3 ${alignClass}`}>
        {items.map((it, i) => {
          const Icon = SOCIAL_ICONS[it.platform] || Globe;
          const brand = SOCIAL_BRAND_COLORS[it.platform] || '#6366f1';
          const stylesCommon: React.CSSProperties = content.style === 'filled' ? { backgroundColor: brand, color: '#ffffff' }
            : content.style === 'outline' ? { borderColor: brand, color: brand, borderWidth: 2, borderStyle: 'solid' }
            : { color: brand };
          return (
            <a
              key={i}
              href={it.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={it.platform}
              className={`inline-flex items-center justify-center transition-transform hover:scale-110 ${sizeClass} ${shapeClass}`}
              style={stylesCommon}
            >
              <Icon className={iconSize} />
            </a>
          );
        })}
      </div>
    </StyledSection>
  );
}

// ---------------------------------------------------------------------------
// Progress bars / circles
// ---------------------------------------------------------------------------

function ProgressBlock({ content, style }: { content: ProgressBlockContent; style?: BlockStyle }) {
  const showValue = content.show_value !== false;
  const display = content.display || 'bar';

  if (display === 'circle') {
    return (
      <StyledSection style={style} defaultPaddingY="py-10">
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {content.items.map((it, i) => {
            const pct = Math.max(0, Math.min(100, it.value));
            const color = it.color || '#6366f1';
            // SVG ring: r=40 → circumference 251.3
            const circumference = 2 * Math.PI * 40;
            const offset = circumference - (pct / 100) * circumference;
            return (
              <div key={i} className="flex flex-col items-center">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                  <circle
                    cx="50" cy="50" r="40" stroke={color} strokeWidth="8" fill="none"
                    strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s ease-out' }}
                  />
                  {showValue && (
                    <text x="50" y="55" textAnchor="middle" className="fill-foreground" fontSize="18" fontWeight="700">
                      {pct}%
                    </text>
                  )}
                </svg>
                <p className="mt-2 text-sm font-medium text-foreground">{it.label}</p>
              </div>
            );
          })}
        </div>
      </StyledSection>
    );
  }

  return (
    <StyledSection style={style} defaultPaddingY="py-10">
      <div className="mx-auto max-w-3xl space-y-4">
        {content.items.map((it, i) => {
          const pct = Math.max(0, Math.min(100, it.value));
          const color = it.color || '#6366f1';
          return (
            <div key={i}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{it.label}</span>
                {showValue && <span className="text-muted-foreground">{pct}%</span>}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </StyledSection>
  );
}

// ---------------------------------------------------------------------------
// Accordion — collapsible list (different from Tabs)
// ---------------------------------------------------------------------------

function AccordionBlock({ content, style }: { content: AccordionBlockContent; style?: BlockStyle }) {
  const items = content.items || [];
  const allowMultiple = !!content.allow_multiple;
  const [open, setOpen] = useState<Set<number>>(() => {
    if (content.default_open != null && content.default_open >= 0) {
      return new Set([content.default_open]);
    }
    return new Set();
  });

  const toggle = (i: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else {
        if (!allowMultiple) next.clear();
        next.add(i);
      }
      return next;
    });
  };

  return (
    <StyledSection style={style} defaultPaddingY="py-12">
      <div className="mx-auto max-w-3xl space-y-3">
        {items.map((item, i) => {
          const isOpen = open.has(i);
          return (
            <div key={i} className="overflow-hidden rounded-lg border border-border bg-card">
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-accent/50"
              >
                <span className="text-base font-medium text-foreground">{item.title}</span>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div
                  className="border-t border-border px-5 py-4 text-sm leading-relaxed text-muted-foreground prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.content || '') }}
                />
              )}
            </div>
          );
        })}
      </div>
    </StyledSection>
  );
}

// ---------------------------------------------------------------------------
// Flip box
// ---------------------------------------------------------------------------

function FlipBoxBlock({ content, style }: { content: FlipBoxBlockContent; style?: BlockStyle }) {
  const items = content.items || [];
  const cols = content.columns ?? 3;
  const trigger = content.trigger ?? 'hover';
  const colsClass = cols === 1 ? 'grid-cols-1' : cols === 2 ? 'sm:grid-cols-2' : cols === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3';
  const [flipped, setFlipped] = useState<Set<number>>(new Set());

  return (
    <StyledSection style={style} defaultPaddingY="py-12">
      <div className={`mx-auto grid max-w-6xl gap-6 ${colsClass}`}>
        {items.map((it, i) => {
          const isFlipped = flipped.has(i);
          return (
            <div
              key={i}
              className={`flip-card relative h-72 ${trigger === 'hover' ? 'flip-on-hover' : ''}`}
              data-flipped={isFlipped}
              onClick={() => {
                if (trigger !== 'click') return;
                setFlipped((p) => {
                  const next = new Set(p);
                  next.has(i) ? next.delete(i) : next.add(i);
                  return next;
                });
              }}
            >
              <div className="flip-card-inner relative h-full w-full">
                <div className="flip-card-front overflow-hidden rounded-xl border border-border bg-card p-6 text-center shadow-sm">
                  {it.front_image_url ? (
                    <img src={it.front_image_url} alt="" className="mx-auto mb-4 h-20 w-20 rounded-full object-cover" />
                  ) : (
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl text-primary">
                      {it.front_icon || '★'}
                    </div>
                  )}
                  <h3 className="text-lg font-semibold text-foreground">{it.front_title}</h3>
                  {it.front_subtitle && <p className="mt-2 text-sm text-muted-foreground">{it.front_subtitle}</p>}
                </div>
                <div className="flip-card-back overflow-hidden rounded-xl bg-primary p-6 text-center text-primary-foreground shadow-md">
                  <h3 className="text-lg font-semibold">{it.back_title}</h3>
                  <p className="mt-2 text-sm opacity-90">{it.back_text}</p>
                  {it.back_button_label && it.back_button_url && (
                    <a
                      href={it.back_button_url}
                      className="mt-4 inline-flex items-center gap-1 rounded-md bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-white/90"
                    >
                      {it.back_button_label} <ArrowRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </StyledSection>
  );
}

// ---------------------------------------------------------------------------
// Price list — menu-style with dotted leaders
// ---------------------------------------------------------------------------

function PriceListBlock({ content, style }: { content: PriceListBlockContent; style?: BlockStyle }) {
  return (
    <StyledSection style={style} defaultPaddingY="py-12">
      <div className="mx-auto max-w-3xl">
        <ul className="divide-y divide-border">
          {content.items.map((item, i) => {
            const row = (
              <li key={i} className="flex items-start gap-4 py-4">
                {item.image_url && (
                  <img src={item.image_url} alt="" className="h-16 w-16 flex-shrink-0 rounded-md object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-3">
                    <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                    <span
                      aria-hidden="true"
                      className="flex-1 border-b border-dotted border-border self-end mb-1"
                    />
                    <span className="text-base font-bold text-primary whitespace-nowrap">{item.price}</span>
                  </div>
                  {item.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  )}
                </div>
              </li>
            );
            return item.link_url ? (
              <a key={i} href={item.link_url} className="block hover:bg-accent/30 -mx-2 px-2 rounded">
                {row}
              </a>
            ) : row;
          })}
        </ul>
      </div>
    </StyledSection>
  );
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

export function BlockRenderer({ block }: { block: CmsBlock }) {
  if (!block.is_visible) return null;

  const content = block.content as Record<string, unknown>;
  // Universal styling (background, padding, borders, radius, shadow, fonts,
  // alignment, animation) lives in `settings.style`. Each block that opts in
  // forwards this to `<StyledSection>`.
  const style = (block.settings as BlockSettings | undefined)?.style;

  switch (block.block_type) {
    case 'hero':
      return <HeroBlock content={content as unknown as HeroBlockContent} style={style} />;
    case 'heading':
      return <HeadingBlock content={content as unknown as HeadingBlockContent} style={style} />;
    case 'text':
      return <TextBlock content={content as unknown as TextBlockContent} style={style} />;
    case 'image':
      return <ImageBlock content={content as unknown as ImageBlockContent} style={style} />;
    case 'gallery':
      return <GalleryBlock content={content as unknown as GalleryBlockContent} style={style} />;
    case 'video':
      return <VideoBlock content={content as unknown as VideoBlockContent} />;
    case 'map':
      return <MapBlock content={content as unknown as MapBlockContent} />;
    case 'schedule':
      return <ScheduleBlock />;
    case 'exhibitor_list':
      return <ExhibitorListBlock />;
    case 'contact_form':
      return <ContactFormBlock content={content as unknown as ContactFormBlockContent} />;
    case 'faq':
      return <FaqBlock content={content as unknown as FaqBlockContent} style={style} />;
    case 'countdown':
      return <CountdownBlock content={content as unknown as CountdownBlockContent} />;
    case 'custom_html':
      return <CustomHtmlBlock content={content as unknown as CustomHtmlBlockContent} />;
    case 'image_text':
      return <ImageTextBlock content={content as unknown as ImageTextBlockContent} style={style} />;
    case 'cta':
      return <CtaBlock content={content as unknown as CtaBlockContent} style={style} />;
    case 'testimonial':
      return <TestimonialBlock content={content as unknown as TestimonialBlockContent} style={style} />;
    case 'pricing_table':
      return <PricingTableBlock content={content as unknown as PricingTableBlockContent} />;
    case 'icon_box':
      return <IconBoxBlock content={content as unknown as IconBoxBlockContent} />;
    case 'team_member':
      return <TeamMemberBlock content={content as unknown as TeamMemberBlockContent} />;
    case 'stats':
      return <StatsBlock content={content as unknown as StatsBlockContent} style={style} />;
    case 'separator':
      return <SeparatorBlock content={content as unknown as SeparatorBlockContent} />;
    case 'spacer':
      return <SpacerBlock content={content as unknown as SpacerBlockContent} />;
    case 'alert':
      return <AlertBlock content={content as unknown as AlertBlockContent} />;
    case 'tabs':
      return <TabsBlock content={content as unknown as TabsBlockContent} />;
    case 'accordion':
      return <AccordionBlock content={content as unknown as AccordionBlockContent} style={style} />;
    case 'logo_carousel':
      return <LogoCarouselBlock content={content as unknown as LogoCarouselBlockContent} />;
    case 'button':
      return <ButtonBlock content={content as unknown as ButtonBlockContent} />;
    case 'animated_heading':
      return <AnimatedHeadingBlock content={content as unknown as AnimatedHeadingBlockContent} style={style} />;
    case 'blockquote':
      return <BlockquoteBlock content={content as unknown as BlockquoteBlockContent} style={style} />;
    case 'social_icons':
      return <SocialIconsBlock content={content as unknown as SocialIconsBlockContent} style={style} />;
    case 'progress':
      return <ProgressBlock content={content as unknown as ProgressBlockContent} style={style} />;
    case 'flip_box':
      return <FlipBoxBlock content={content as unknown as FlipBoxBlockContent} style={style} />;
    case 'price_list':
      return <PriceListBlock content={content as unknown as PriceListBlockContent} style={style} />;
    default:
      return null;
  }
}
