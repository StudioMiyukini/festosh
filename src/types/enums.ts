/**
 * Festosh platform enums — mirrors the database enum types.
 */

/** Role a user holds at the platform level. */
export type PlatformRole = 'user' | 'organizer' | 'admin';

/** Role a user holds within a specific festival. */
export type FestivalRole =
  | 'owner'
  | 'admin'
  | 'editor'
  | 'moderator'
  | 'volunteer'
  | 'exhibitor';

/** Publication lifecycle of a festival. */
export type FestivalStatus = 'draft' | 'published' | 'archived';

/** Lifecycle stage of a festival edition. */
export type EditionStatus =
  | 'planning'
  | 'registration_open'
  | 'registration_closed'
  | 'upcoming'
  | 'ongoing'
  | 'completed'
  | 'cancelled';

/** Status of an exhibitor booth application. */
export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'waitlisted'
  | 'cancelled';

/** CMS block types available in the page builder. */
export type BlockType =
  | 'hero'
  | 'text'
  | 'image'
  | 'gallery'
  | 'video'
  | 'map'
  | 'schedule'
  | 'exhibitor_list'
  | 'contact_form'
  | 'faq'
  | 'countdown'
  | 'custom_html';

/** Whether a budget entry represents income or an expense. */
export type BudgetEntryType = 'income' | 'expense';

/** Channel through which a notification is delivered. */
export type NotificationChannel = 'in_app' | 'email' | 'both';

/** Current status of a volunteer shift. */
export type ShiftStatus = 'open' | 'assigned' | 'completed' | 'cancelled';

/** Element types available on floor plans. */
export type FloorPlanElementType =
  | 'booth'
  | 'stage'
  | 'entrance'
  | 'exit'
  | 'toilet'
  | 'parking'
  | 'food_court'
  | 'first_aid'
  | 'info_point'
  | 'pmr_access'
  | 'wall'
  | 'barrier'
  | 'decoration'
  | 'custom';
