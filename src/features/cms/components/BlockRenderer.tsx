import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import type { CmsBlock } from '@/types/cms';
import type {
  HeroBlockContent,
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
  LogoCarouselBlockContent,
  ButtonBlockContent,
} from '@/types/cms';

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function HeroBlock({ content }: { content: HeroBlockContent }) {
  const opacity = content.overlay_opacity ?? 0.5;

  return (
    <section className="relative flex min-h-[400px] items-center justify-center overflow-hidden">
      {content.background_image_url && (
        <>
          <img
            src={content.background_image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 bg-black"
            style={{ opacity }}
          />
        </>
      )}
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-20 text-center">
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
    </section>
  );
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

function TextBlock({ content }: { content: TextBlockContent }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div
        className="prose prose-neutral max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: content.body }}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------

function ImageBlock({ content }: { content: ImageBlockContent }) {
  const img = (
    <img
      src={content.image_url}
      alt={content.alt_text ?? ''}
      className="h-auto w-full rounded-lg"
    />
  );

  return (
    <figure className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
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
  );
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

function GalleryBlock({ content }: { content: GalleryBlockContent }) {
  const images = content.images ?? [];

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {images.map((image, index) => (
          <figure key={index} className="overflow-hidden rounded-lg">
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
    </section>
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
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
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
          loading="lazy"
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

function FaqBlock({ content }: { content: FaqBlockContent }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const items = content.items ?? [];

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="divide-y divide-border rounded-lg border border-border">
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
    </section>
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
      <div dangerouslySetInnerHTML={{ __html: content.html }} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Image + Text
// ---------------------------------------------------------------------------

function ImageTextBlock({ content }: { content: ImageTextBlockContent }) {
  const alignMap = { top: 'items-start', center: 'items-center', bottom: 'items-end' };
  const align = alignMap[content.vertical_align ?? 'center'];
  const imageFirst = (content.image_position ?? 'left') === 'left';

  const imageEl = (
    <div className="w-full md:w-1/2">
      <img
        src={content.image_url}
        alt={content.alt_text ?? ''}
        className="h-auto w-full rounded-lg"
      />
    </div>
  );

  const textEl = (
    <div className="w-full md:w-1/2">
      {content.title && (
        <h3 className="mb-3 text-2xl font-bold text-foreground">{content.title}</h3>
      )}
      <div
        className="prose prose-neutral max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: content.body }}
      />
    </div>
  );

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className={`flex flex-col gap-8 md:flex-row ${align}`}>
        {imageFirst ? (
          <>
            {imageEl}
            {textEl}
          </>
        ) : (
          <>
            {textEl}
            {imageEl}
          </>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// CTA
// ---------------------------------------------------------------------------

function CtaBlock({ content }: { content: CtaBlockContent }) {
  return (
    <section
      className="py-16"
      style={{
        backgroundColor: content.background_color || undefined,
        color: content.text_color || undefined,
      }}
    >
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
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
    </section>
  );
}

// ---------------------------------------------------------------------------
// Testimonial
// ---------------------------------------------------------------------------

function TestimonialBlock({ content }: { content: TestimonialBlockContent }) {
  const items = content.items ?? [];

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
    </section>
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

function StatsBlock({ content }: { content: StatsBlockContent }) {
  const items = content.items ?? [];

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
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
    </section>
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
          dangerouslySetInnerHTML={{ __html: tabs[activeTab]?.body ?? '' }}
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
// Main dispatcher
// ---------------------------------------------------------------------------

export function BlockRenderer({ block }: { block: CmsBlock }) {
  if (!block.is_visible) return null;

  const content = block.content as Record<string, unknown>;

  switch (block.block_type) {
    case 'hero':
      return <HeroBlock content={content as unknown as HeroBlockContent} />;
    case 'text':
      return <TextBlock content={content as unknown as TextBlockContent} />;
    case 'image':
      return <ImageBlock content={content as unknown as ImageBlockContent} />;
    case 'gallery':
      return <GalleryBlock content={content as unknown as GalleryBlockContent} />;
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
      return <FaqBlock content={content as unknown as FaqBlockContent} />;
    case 'countdown':
      return <CountdownBlock content={content as unknown as CountdownBlockContent} />;
    case 'custom_html':
      return <CustomHtmlBlock content={content as unknown as CustomHtmlBlockContent} />;
    case 'image_text':
      return <ImageTextBlock content={content as unknown as ImageTextBlockContent} />;
    case 'cta':
      return <CtaBlock content={content as unknown as CtaBlockContent} />;
    case 'testimonial':
      return <TestimonialBlock content={content as unknown as TestimonialBlockContent} />;
    case 'pricing_table':
      return <PricingTableBlock content={content as unknown as PricingTableBlockContent} />;
    case 'icon_box':
      return <IconBoxBlock content={content as unknown as IconBoxBlockContent} />;
    case 'team_member':
      return <TeamMemberBlock content={content as unknown as TeamMemberBlockContent} />;
    case 'stats':
      return <StatsBlock content={content as unknown as StatsBlockContent} />;
    case 'separator':
      return <SeparatorBlock content={content as unknown as SeparatorBlockContent} />;
    case 'spacer':
      return <SpacerBlock content={content as unknown as SpacerBlockContent} />;
    case 'alert':
      return <AlertBlock content={content as unknown as AlertBlockContent} />;
    case 'tabs':
      return <TabsBlock content={content as unknown as TabsBlockContent} />;
    case 'logo_carousel':
      return <LogoCarouselBlock content={content as unknown as LogoCarouselBlockContent} />;
    case 'button':
      return <ButtonBlock content={content as unknown as ButtonBlockContent} />;
    default:
      return null;
  }
}
