/**
 * StyledSection — universal block wrapper.
 *
 * Reads the thematic style settings (`settings.style`) from a CMS block and
 * converts them into a real DOM section with the right background, padding,
 * borders, radius, shadow, alignment and animation.
 *
 * Blocks opt in by replacing their outer `<section>` with `<StyledSection>`:
 *
 *   <StyledSection style={settings?.style} defaultPaddingY="py-12">
 *     ...content...
 *   </StyledSection>
 *
 * The defaults keep the historical look when no style is configured.
 */

import type { CSSProperties, ReactNode } from 'react';
import { useMemo } from 'react';
import type { BlockStyle } from '@/types/cms';

interface StyledSectionProps {
  style?: BlockStyle;
  children: ReactNode;
  /** Tailwind classes applied when the user hasn't set custom padding. */
  defaultPaddingY?: string;
  /** Tailwind classes applied when the user hasn't set custom padding. */
  defaultPaddingX?: string;
  /** When true, the inner container is constrained to a centered max-width
   *  (matches the rest of the layout). Defaults to true; set false for full-bleed
   *  blocks like hero/cta that already span the viewport. */
  contain?: boolean;
  /** Extra classes appended after the dynamic ones. */
  className?: string;
}

const SHADOW_CLASSES = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
} as const;

const ANIMATION_CLASSES = {
  none: '',
  fade_in: 'animate-fade-in',
  slide_up: 'animate-slide-up',
  slide_down: 'animate-slide-down',
  zoom_in: 'animate-zoom-in',
} as const;

const TEXT_ALIGN_CLASSES = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
} as const;

const FONT_WEIGHT_CLASSES = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
} as const;

/** Build the inline `style` object from a BlockStyle. Tailwind-friendly values
 *  go through className for cleaner output; pixel-valued props go inline so
 *  we can express the full continuous range without arbitrary-value soup. */
function buildInlineStyle(s: BlockStyle | undefined): CSSProperties {
  if (!s) return {};
  const css: CSSProperties = {};

  // Background
  switch (s.background_type) {
    case 'color':
      if (s.background_color) css.backgroundColor = s.background_color;
      break;
    case 'gradient': {
      const from = s.background_gradient_from || '#6366f1';
      const to = s.background_gradient_to || '#a855f7';
      const angle = s.background_gradient_angle ?? 135;
      css.backgroundImage = `linear-gradient(${angle}deg, ${from}, ${to})`;
      break;
    }
    case 'image':
      if (s.background_image_url) {
        css.backgroundImage = `url(${JSON.stringify(s.background_image_url)})`;
        css.backgroundSize = s.background_image_size || 'cover';
        css.backgroundPosition = s.background_image_position || 'center';
        css.backgroundRepeat = 'no-repeat';
      }
      break;
  }

  // Text
  if (s.text_color) css.color = s.text_color;
  if (s.font_family) css.fontFamily = s.font_family;
  if (s.font_size_px) css.fontSize = `${s.font_size_px}px`;
  if (s.line_height) css.lineHeight = s.line_height;

  // Spacing — only override when explicitly set (otherwise defaults apply via class)
  if (s.padding_top != null) css.paddingTop = `${s.padding_top}px`;
  if (s.padding_right != null) css.paddingRight = `${s.padding_right}px`;
  if (s.padding_bottom != null) css.paddingBottom = `${s.padding_bottom}px`;
  if (s.padding_left != null) css.paddingLeft = `${s.padding_left}px`;
  if (s.margin_top != null) css.marginTop = `${s.margin_top}px`;
  if (s.margin_bottom != null) css.marginBottom = `${s.margin_bottom}px`;

  // Border
  if (s.border_width != null && s.border_width > 0) {
    css.borderWidth = `${s.border_width}px`;
    css.borderStyle = s.border_style || 'solid';
    if (s.border_color) css.borderColor = s.border_color;
  }
  if (s.border_radius != null) css.borderRadius = `${s.border_radius}px`;

  // Max width
  if (s.max_width_px) css.maxWidth = `${s.max_width_px}px`;

  // Animation delay
  if (s.animation_delay_ms) css.animationDelay = `${s.animation_delay_ms}ms`;

  return css;
}

function buildClassName(s: BlockStyle | undefined, defaults: { paddingY: string; paddingX: string }, paddingOverrides: { top: boolean; right: boolean; bottom: boolean; left: boolean }, extra: string | undefined, contain: boolean): string {
  const parts: string[] = ['relative'];

  // Only emit default padding classes when the user hasn't overridden the
  // corresponding inline value — otherwise the class would conflict with the
  // inline style and Tailwind's win order can flip.
  if (!paddingOverrides.top && !paddingOverrides.bottom) parts.push(defaults.paddingY);
  if (!paddingOverrides.left && !paddingOverrides.right) parts.push(defaults.paddingX);

  if (contain) parts.push('mx-auto');

  if (s) {
    if (s.text_align && TEXT_ALIGN_CLASSES[s.text_align]) parts.push(TEXT_ALIGN_CLASSES[s.text_align]);
    if (s.font_weight && FONT_WEIGHT_CLASSES[s.font_weight]) parts.push(FONT_WEIGHT_CLASSES[s.font_weight]);
    if (s.shadow && SHADOW_CLASSES[s.shadow]) parts.push(SHADOW_CLASSES[s.shadow]);
    if (s.animation && ANIMATION_CLASSES[s.animation]) parts.push(ANIMATION_CLASSES[s.animation]);
    if (s.custom_css_class) {
      // Strip any HTML/quote characters so a misconfigured value can't escape.
      const safe = s.custom_css_class.replace(/[^a-z0-9_\- ]/gi, '');
      if (safe) parts.push(safe);
    }
  }

  if (extra) parts.push(extra);
  return parts.join(' ');
}

export function StyledSection({
  style,
  children,
  defaultPaddingY = 'py-12',
  defaultPaddingX = 'px-4 sm:px-6 lg:px-8',
  contain = true,
  className,
}: StyledSectionProps) {
  const inline = useMemo(() => buildInlineStyle(style), [style]);
  const overrides = useMemo(
    () => ({
      top: style?.padding_top != null,
      right: style?.padding_right != null,
      bottom: style?.padding_bottom != null,
      left: style?.padding_left != null,
    }),
    [style?.padding_top, style?.padding_right, style?.padding_bottom, style?.padding_left],
  );
  const cls = useMemo(
    () => buildClassName(style, { paddingY: defaultPaddingY, paddingX: defaultPaddingX }, overrides, className, contain),
    [style, defaultPaddingY, defaultPaddingX, overrides, className, contain],
  );

  // Background overlay (only meaningful when there's a background image or color)
  const overlay = style?.background_overlay_color && style.background_type === 'image' ? (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundColor: style.background_overlay_color,
        opacity: style.background_overlay_opacity ?? 0.4,
        borderRadius: inline.borderRadius,
      }}
    />
  ) : null;

  // Width container — `contain` constrains content but the section itself
  // can be full-bleed if `full_width` is set.
  const innerMaxWidth = style?.max_width_px ? `${style.max_width_px}px` : contain ? '64rem' : undefined;
  const isFullBleed = style?.full_width;

  return (
    <section
      className={cls + (isFullBleed ? ' w-full' : '')}
      style={{
        ...inline,
        // The maxWidth inline above applies to the section itself; if we're
        // containing content, prefer to apply it on a wrapper instead.
        maxWidth: contain ? innerMaxWidth : inline.maxWidth,
      }}
    >
      {overlay}
      <div className={overlay ? 'relative' : ''}>{children}</div>
    </section>
  );
}
