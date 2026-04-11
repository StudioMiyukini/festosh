import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// ─── Helpers ────────────────────────────────────────────────────────────────
const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID());

const createdAt = () =>
  integer('created_at').$defaultFn(() => Math.floor(Date.now() / 1000));

const updatedAt = () =>
  integer('updated_at').$defaultFn(() => Math.floor(Date.now() / 1000));

// ═══════════════════════════════════════════════════════════════════════════
// TABLES
// ═══════════════════════════════════════════════════════════════════════════

// ─── Profiles ───────────────────────────────────────────────────────────────
export const profiles = sqliteTable(
  'profiles',
  {
    id: id(),
    username: text('username').unique().notNull(),
    displayName: text('display_name'),
    email: text('email').unique().notNull(),
    passwordHash: text('password_hash').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    birthDate: text('birth_date'), // ISO date YYYY-MM-DD
    avatarUrl: text('avatar_url'),
    bio: text('bio'),
    platformRole: text('platform_role').default('user'),
    userType: text('user_type').default('visitor'), // visitor | volunteer | exhibitor | organizer
    phone: text('phone'),
    volunteerBio: text('volunteer_bio'),
    volunteerSkills: text('volunteer_skills'), // JSON array of strings
    locale: text('locale').default('fr'),
    timezone: text('timezone').default('Europe/Paris'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    emailVerified: integer('email_verified').notNull().default(0),
    emailVerificationToken: text('email_verification_token'),
    emailVerificationExpires: integer('email_verification_expires'),
    xp: integer('xp').notNull().default(0),
    coins: integer('coins').notNull().default(0),
    xpLevel: integer('xp_level').notNull().default(1),
  },
  (table) => [
    index('profiles_email_idx').on(table.email),
    index('profiles_username_idx').on(table.username),
    index('profiles_platform_role_idx').on(table.platformRole),
    index('profiles_user_type_idx').on(table.userType),
  ],
);

// ─── Documents ─────────────────────────────────────────────────────────────
export const documents = sqliteTable(
  'documents',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => profiles.id),
    fileName: text('file_name').notNull(),
    storagePath: text('storage_path').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    documentType: text('document_type').notNull(), // kbis | insurance | id_card | association_registration | other
    label: text('label'), // Custom label set by user
    status: text('status').default('pending'), // pending | verified | rejected
    reviewNotes: text('review_notes'),
    reviewedBy: text('reviewed_by').references(() => profiles.id),
    reviewedAt: integer('reviewed_at'),
    expiresAt: integer('expires_at'),
    renewalReminderSent: integer('renewal_reminder_sent').default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('documents_user_id_idx').on(table.userId),
    index('documents_document_type_idx').on(table.documentType),
    index('documents_status_idx').on(table.status),
  ],
);

// ─── Festivals ──────────────────────────────────────────────────────────────
export const festivals = sqliteTable(
  'festivals',
  {
    id: id(),
    slug: text('slug').unique().notNull(),
    name: text('name').notNull(),
    description: text('description'),
    logoUrl: text('logo_url'),
    bannerUrl: text('banner_url'),
    themePrimaryColor: text('theme_primary_color').default('#6366f1'),
    themeSecondaryColor: text('theme_secondary_color').default('#ec4899'),
    themeFont: text('theme_font').default('Inter'),
    themeAccentColor: text('theme_accent_color').default('#f59e0b'),
    themeBgColor: text('theme_bg_color').default('#ffffff'),
    themeTextColor: text('theme_text_color').default('#111827'),
    customCss: text('custom_css'),
    emailConfig: text('email_config'), // JSON: {host,port,user,pass,from_email,from_name,encryption}
    headerStyle: text('header_style').default('default'),
    country: text('country'),
    city: text('city'),
    address: text('address'),
    latitude: real('latitude'),
    longitude: real('longitude'),
    website: text('website'),
    contactEmail: text('contact_email'),
    socialLinks: text('social_links'), // JSON string
    tags: text('tags'), // JSON string array
    status: text('status').default('draft'),
    createdBy: text('created_by').references(() => profiles.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('festivals_slug_idx').on(table.slug),
    index('festivals_status_idx').on(table.status),
    index('festivals_created_by_idx').on(table.createdBy),
    index('festivals_city_idx').on(table.city),
  ],
);

// ─── Festival Members ───────────────────────────────────────────────────────
export const festivalMembers = sqliteTable(
  'festival_members',
  {
    id: id(),
    festivalId: text('festival_id')
      .notNull()
      .references(() => festivals.id),
    userId: text('user_id')
      .notNull()
      .references(() => profiles.id),
    role: text('role').default('exhibitor'),
    invitedBy: text('invited_by').references(() => profiles.id),
    joinedAt: integer('joined_at').$defaultFn(() => Math.floor(Date.now() / 1000)),
  },
  (table) => [
    uniqueIndex('festival_members_festival_user_idx').on(table.festivalId, table.userId),
    index('festival_members_festival_id_idx').on(table.festivalId),
    index('festival_members_user_id_idx').on(table.userId),
    index('festival_members_role_idx').on(table.role),
  ],
);

// ─── Editions ───────────────────────────────────────────────────────────────
export const editions = sqliteTable(
  'editions',
  {
    id: id(),
    festivalId: text('festival_id')
      .notNull()
      .references(() => festivals.id),
    name: text('name'),
    slug: text('slug'),
    description: text('description'),
    startDate: text('start_date'), // ISO date
    endDate: text('end_date'), // ISO date
    status: text('status').default('planning'),
    exhibitorRegistrationStart: integer('exhibitor_registration_start'),
    exhibitorRegistrationEnd: integer('exhibitor_registration_end'),
    volunteerRegistrationStart: integer('volunteer_registration_start'),
    volunteerRegistrationEnd: integer('volunteer_registration_end'),
    expectedVisitors: integer('expected_visitors'),
    maxExhibitors: integer('max_exhibitors'),
    maxVolunteers: integer('max_volunteers'),
    visitorHours: text('visitor_hours'), // JSON
    isActive: integer('is_active').default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('editions_festival_slug_idx').on(table.festivalId, table.slug),
    index('editions_festival_id_idx').on(table.festivalId),
    index('editions_status_idx').on(table.status),
    index('editions_is_active_idx').on(table.isActive),
  ],
);

// ─── CMS Pages ──────────────────────────────────────────────────────────────
export const cmsPages = sqliteTable(
  'cms_pages',
  {
    id: id(),
    festivalId: text('festival_id')
      .notNull()
      .references(() => festivals.id),
    slug: text('slug'),
    title: text('title'),
    isPublished: integer('is_published').default(0),
    isHomepage: integer('is_homepage').default(0),
    isSystem: integer('is_system').default(0),
    metaDescription: text('meta_description'),
    sortOrder: integer('sort_order').default(0),
    createdBy: text('created_by').references(() => profiles.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('cms_pages_festival_slug_idx').on(table.festivalId, table.slug),
    index('cms_pages_festival_id_idx').on(table.festivalId),
    index('cms_pages_is_published_idx').on(table.isPublished),
  ],
);

// ─── CMS Blocks ─────────────────────────────────────────────────────────────
export const cmsBlocks = sqliteTable(
  'cms_blocks',
  {
    id: id(),
    pageId: text('page_id')
      .notNull()
      .references(() => cmsPages.id),
    blockType: text('block_type'),
    content: text('content'), // JSON
    settings: text('settings'), // JSON
    sortOrder: integer('sort_order').default(0),
    isVisible: integer('is_visible').default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('cms_blocks_page_id_idx').on(table.pageId),
    index('cms_blocks_sort_order_idx').on(table.sortOrder),
  ],
);

// ─── CMS Navigation ────────────────────────────────────────────────────────
export const cmsNavigation = sqliteTable(
  'cms_navigation',
  {
    id: id(),
    festivalId: text('festival_id')
      .notNull()
      .references(() => festivals.id),
    parentId: text('parent_id'),
    label: text('label').notNull(),
    linkType: text('link_type').notNull(), // 'page' | 'internal' | 'external'
    target: text('target').notNull(), // page_id, path, or URL
    sortOrder: integer('sort_order').default(0),
    isVisible: integer('is_visible').default(1),
    openNewTab: integer('open_new_tab').default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('cms_nav_festival_id_idx').on(table.festivalId),
    index('cms_nav_parent_id_idx').on(table.parentId),
    index('cms_nav_sort_order_idx').on(table.sortOrder),
  ],
);

// ─── Exhibitor Profiles ─────────────────────────────────────────────────────
export const exhibitorProfiles = sqliteTable(
  'exhibitor_profiles',
  {
    id: id(),
    userId: text('user_id')
      .unique()
      .references(() => profiles.id),
    companyName: text('company_name'),
    tradeName: text('trade_name'),
    activityType: text('activity_type'),
    category: text('category'),
    description: text('description'),
    logoUrl: text('logo_url'),
    photoUrl: text('photo_url'),
    website: text('website'),
    socialLinks: text('social_links'), // JSON
    legalForm: text('legal_form'),
    registrationNumber: text('registration_number'), // KBIS or INSEE number
    siret: text('siret'),
    vatNumber: text('vat_number'),
    insurerName: text('insurer_name'),
    insuranceContractNumber: text('insurance_contract_number'),
    insuranceExpiresAt: integer('insurance_expires_at'),
    kbisFileUrl: text('kbis_file_url'),
    insuranceFileUrl: text('insurance_file_url'),
    idFileUrl: text('id_file_url'),
    contactFirstName: text('contact_first_name'),
    contactLastName: text('contact_last_name'),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    addressLine1: text('address_line1'),
    addressLine2: text('address_line2'),
    postalCode: text('postal_code'),
    city: text('city'),
    country: text('country').default('FR'),
    billingAddressLine1: text('billing_address_line1'),
    billingAddressLine2: text('billing_address_line2'),
    billingPostalCode: text('billing_postal_code'),
    billingCity: text('billing_city'),
    billingCountry: text('billing_country').default('FR'),
    visibility: text('visibility').default('{}'), // JSON: { field: "public" | "organizer" }
    isPmr: integer('is_pmr').default(0), // Personne a mobilite reduite
    domains: text('domains').default('[]'), // JSON array of domain strings
    directoryVisible: integer('directory_visible').default(1), // 0 = hidden, 1 = visible in directory
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('exhibitor_profiles_user_id_idx').on(table.userId),
    index('exhibitor_profiles_category_idx').on(table.category),
  ],
);

// ─── Booth Types ───────────────────────────────────────────────────────────
export const boothTypes = sqliteTable(
  'booth_types',
  {
    id: id(),
    editionId: text('edition_id')
      .notNull()
      .references(() => editions.id),
    name: text('name').notNull(),
    description: text('description'),
    widthM: real('width_m'),
    depthM: real('depth_m'),
    priceCents: integer('price_cents').default(0),
    pricingMode: text('pricing_mode').default('flat'), // 'flat' | 'per_day'
    hasElectricity: integer('has_electricity').default(0),
    electricityPriceCents: integer('electricity_price_cents').default(0),
    hasWater: integer('has_water').default(0),
    waterPriceCents: integer('water_price_cents').default(0),
    maxWattage: integer('max_wattage'),
    equipmentOptions: text('equipment_options'), // JSON: [{item_id, included, price_cents}]
    color: text('color').default('#6366f1'),
    sortOrder: integer('sort_order').default(0),
    isActive: integer('is_active').default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('booth_types_edition_id_idx').on(table.editionId),
  ],
);

// ─── Booth Locations ────────────────────────────────────────────────────────
export const boothLocations = sqliteTable(
  'booth_locations',
  {
    id: id(),
    editionId: text('edition_id')
      .notNull()
      .references(() => editions.id),
    code: text('code'),
    zone: text('zone'),
    widthM: real('width_m'),
    depthM: real('depth_m'),
    hasElectricity: integer('has_electricity').default(0),
    electricityPriceCents: integer('electricity_price_cents').default(0),
    maxWattage: integer('max_wattage'),
    hasWater: integer('has_water').default(0),
    waterPriceCents: integer('water_price_cents').default(0),
    isInterior: integer('is_interior').default(1),
    isAccessible: integer('is_accessible').default(1),
    priceCents: integer('price_cents').default(0),
    equipmentIncluded: text('equipment_included'), // JSON array
    boothTypeId: text('booth_type_id').references(() => boothTypes.id),
    pricingMode: text('pricing_mode').default('flat'), // 'flat' | 'per_day'
    notes: text('notes'),
    planPosition: text('plan_position'), // JSON
    isAvailable: integer('is_available').default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('booth_locations_edition_code_idx').on(table.editionId, table.code),
    index('booth_locations_edition_id_idx').on(table.editionId),
    index('booth_locations_zone_idx').on(table.zone),
    index('booth_locations_is_available_idx').on(table.isAvailable),
  ],
);

// ─── Booth Applications ─────────────────────────────────────────────────────
export const boothApplications = sqliteTable(
  'booth_applications',
  {
    id: id(),
    editionId: text('edition_id')
      .notNull()
      .references(() => editions.id),
    exhibitorId: text('exhibitor_id')
      .notNull()
      .references(() => exhibitorProfiles.id),
    preferredZone: text('preferred_zone'),
    requestedWidthM: real('requested_width_m'),
    requestedDepthM: real('requested_depth_m'),
    needsElectricity: integer('needs_electricity').default(0),
    requestedWattage: integer('requested_wattage'),
    needsWater: integer('needs_water').default(0),
    needsTables: integer('needs_tables'),
    needsChairs: integer('needs_chairs'),
    specialRequests: text('special_requests'),
    productsDescription: text('products_description'),
    status: text('status').default('draft'),
    reviewedBy: text('reviewed_by').references(() => profiles.id),
    reviewedAt: integer('reviewed_at'),
    reviewNotes: text('review_notes'),
    assignedBoothId: text('assigned_booth_id').references(() => boothLocations.id),
    amountCents: integer('amount_cents'),
    isPaid: integer('is_paid').default(0),
    paidAt: integer('paid_at'),
    documents: text('documents'), // JSON
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('booth_applications_edition_exhibitor_idx').on(table.editionId, table.exhibitorId),
    index('booth_applications_edition_id_idx').on(table.editionId),
    index('booth_applications_exhibitor_id_idx').on(table.exhibitorId),
    index('booth_applications_status_idx').on(table.status),
  ],
);

// ─── Venues ─────────────────────────────────────────────────────────────────
export const venues = sqliteTable(
  'venues',
  {
    id: id(),
    festivalId: text('festival_id')
      .notNull()
      .references(() => festivals.id),
    name: text('name'),
    description: text('description'),
    venueType: text('venue_type'),
    capacity: integer('capacity'),
    address: text('address'),
    planPosition: text('plan_position'), // JSON
    isActive: integer('is_active').default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('venues_festival_id_idx').on(table.festivalId),
    index('venues_venue_type_idx').on(table.venueType),
  ],
);

// ─── Events ─────────────────────────────────────────────────────────────────
export const events = sqliteTable(
  'events',
  {
    id: id(),
    editionId: text('edition_id')
      .notNull()
      .references(() => editions.id),
    venueId: text('venue_id').references(() => venues.id),
    title: text('title'),
    description: text('description'),
    category: text('category'),
    startTime: integer('start_time'),
    endTime: integer('end_time'),
    isPublic: integer('is_public').default(1),
    imageUrl: text('image_url'),
    maxParticipants: integer('max_participants'),
    speakerNames: text('speaker_names'), // JSON array
    tags: text('tags'), // JSON array
    createdBy: text('created_by').references(() => profiles.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('events_edition_id_idx').on(table.editionId),
    index('events_venue_id_idx').on(table.venueId),
    index('events_category_idx').on(table.category),
    index('events_start_time_idx').on(table.startTime),
  ],
);

// ─── Volunteer Roles ────────────────────────────────────────────────────────
export const volunteerRoles = sqliteTable(
  'volunteer_roles',
  {
    id: id(),
    festivalId: text('festival_id')
      .notNull()
      .references(() => festivals.id),
    name: text('name'),
    description: text('description'),
    color: text('color'),
    createdAt: createdAt(),
  },
  (table) => [
    index('volunteer_roles_festival_id_idx').on(table.festivalId),
  ],
);

// ─── Shifts ─────────────────────────────────────────────────────────────────
export const shifts = sqliteTable(
  'shifts',
  {
    id: id(),
    editionId: text('edition_id')
      .notNull()
      .references(() => editions.id),
    roleId: text('role_id').references(() => volunteerRoles.id),
    venueId: text('venue_id').references(() => venues.id),
    title: text('title'),
    description: text('description'),
    startTime: integer('start_time'),
    endTime: integer('end_time'),
    maxVolunteers: integer('max_volunteers').default(1),
    status: text('status').default('open'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('shifts_edition_id_idx').on(table.editionId),
    index('shifts_role_id_idx').on(table.roleId),
    index('shifts_venue_id_idx').on(table.venueId),
    index('shifts_status_idx').on(table.status),
    index('shifts_start_time_idx').on(table.startTime),
  ],
);

// ─── Shift Assignments ─────────────────────────────────────────────────────
export const shiftAssignments = sqliteTable(
  'shift_assignments',
  {
    id: id(),
    shiftId: text('shift_id')
      .notNull()
      .references(() => shifts.id),
    userId: text('user_id')
      .notNull()
      .references(() => profiles.id),
    assignedBy: text('assigned_by').references(() => profiles.id),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('shift_assignments_shift_user_idx').on(table.shiftId, table.userId),
    index('shift_assignments_shift_id_idx').on(table.shiftId),
    index('shift_assignments_user_id_idx').on(table.userId),
  ],
);

// ─── Budget Categories ──────────────────────────────────────────────────────
export const budgetCategories = sqliteTable(
  'budget_categories',
  {
    id: id(),
    festivalId: text('festival_id')
      .notNull()
      .references(() => festivals.id),
    name: text('name'),
    entryType: text('entry_type'), // income / expense
    color: text('color'),
    sortOrder: integer('sort_order').default(0),
  },
  (table) => [
    uniqueIndex('budget_categories_festival_name_type_idx').on(
      table.festivalId,
      table.name,
      table.entryType,
    ),
    index('budget_categories_festival_id_idx').on(table.festivalId),
  ],
);

// ─── Budget Entries ─────────────────────────────────────────────────────────
export const budgetEntries = sqliteTable(
  'budget_entries',
  {
    id: id(),
    editionId: text('edition_id')
      .notNull()
      .references(() => editions.id),
    categoryId: text('category_id').references(() => budgetCategories.id),
    entryType: text('entry_type'), // income / expense
    description: text('description'),
    amountCents: integer('amount_cents'),
    date: text('date'), // ISO date
    receiptUrl: text('receipt_url'),
    paymentMethod: text('payment_method'),
    notes: text('notes'),
    createdBy: text('created_by').references(() => profiles.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('budget_entries_edition_id_idx').on(table.editionId),
    index('budget_entries_category_id_idx').on(table.categoryId),
    index('budget_entries_entry_type_idx').on(table.entryType),
    index('budget_entries_date_idx').on(table.date),
  ],
);

// ─── Equipment Items ────────────────────────────────────────────────────────
export const equipmentItems = sqliteTable(
  'equipment_items',
  {
    id: id(),
    festivalId: text('festival_id')
      .notNull()
      .references(() => festivals.id),
    name: text('name'),
    description: text('description'),
    category: text('category'),
    unit: text('unit').default('unit'),
    photoUrl: text('photo_url'),
    totalQuantity: integer('total_quantity').default(0),
    ownerName: text('owner_name'),
    valueCents: integer('value_cents').default(0),
    acquisitionType: text('acquisition_type').default('owned'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('equipment_items_festival_id_idx').on(table.festivalId),
    index('equipment_items_category_idx').on(table.category),
  ],
);

// ─── Equipment Assignments ──────────────────────────────────────────────────
export const equipmentAssignments = sqliteTable(
  'equipment_assignments',
  {
    id: id(),
    itemId: text('item_id')
      .notNull()
      .references(() => equipmentItems.id),
    editionId: text('edition_id')
      .notNull()
      .references(() => editions.id),
    assignedToType: text('assigned_to_type'), // e.g. 'booth', 'venue', 'event'
    assignedToId: text('assigned_to_id'),
    quantity: integer('quantity').default(1),
    status: text('status').default('requested'),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('equipment_assignments_item_id_idx').on(table.itemId),
    index('equipment_assignments_edition_id_idx').on(table.editionId),
    index('equipment_assignments_status_idx').on(table.status),
  ],
);

// ─── Equipment Owners ──────────────────────────────────────────────────────
export const equipmentOwners = sqliteTable(
  'equipment_owners',
  {
    id: id(),
    festivalId: text('festival_id')
      .notNull()
      .references(() => festivals.id),
    name: text('name').notNull(),
    contactInfo: text('contact_info'),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('equipment_owners_festival_id_idx').on(table.festivalId),
  ],
);

// ─── Meetings ──────────────────────────────────────────────────────────────
export const meetings = sqliteTable(
  'meetings',
  {
    id: id(),
    festivalId: text('festival_id')
      .notNull()
      .references(() => festivals.id),
    title: text('title').notNull(),
    description: text('description'),
    scheduledAt: integer('scheduled_at'),
    durationMinutes: integer('duration_minutes').default(60),
    location: text('location'),
    status: text('status').default('planned'),
    createdBy: text('created_by').references(() => profiles.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('meetings_festival_id_idx').on(table.festivalId),
    index('meetings_scheduled_at_idx').on(table.scheduledAt),
    index('meetings_status_idx').on(table.status),
  ],
);

// ─── Meeting Blocks ────────────────────────────────────────────────────────
export const meetingBlocks = sqliteTable(
  'meeting_blocks',
  {
    id: id(),
    meetingId: text('meeting_id')
      .notNull()
      .references(() => meetings.id),
    blockType: text('block_type').notNull(),
    content: text('content'), // JSON
    sortOrder: integer('sort_order').default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('meeting_blocks_meeting_id_idx').on(table.meetingId),
    index('meeting_blocks_sort_order_idx').on(table.sortOrder),
  ],
);

// ─── Meeting Attendees ─────────────────────────────────────────────────────
export const meetingAttendees = sqliteTable(
  'meeting_attendees',
  {
    id: id(),
    meetingId: text('meeting_id')
      .notNull()
      .references(() => meetings.id),
    userId: text('user_id')
      .notNull()
      .references(() => profiles.id),
    status: text('status').default('invited'),
    createdAt: createdAt(),
  },
  (table) => [
    index('meeting_attendees_meeting_id_idx').on(table.meetingId),
    index('meeting_attendees_user_id_idx').on(table.userId),
  ],
);

// ─── Tasks ─────────────────────────────────────────────────────────────────
export const tasks = sqliteTable(
  'tasks',
  {
    id: id(),
    festivalId: text('festival_id')
      .notNull()
      .references(() => festivals.id),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').default('todo'),
    priority: text('priority').default('medium'),
    assignedTo: text('assigned_to').references(() => profiles.id),
    dueDate: text('due_date'), // ISO date
    meetingId: text('meeting_id').references(() => meetings.id),
    meetingBlockId: text('meeting_block_id').references(() => meetingBlocks.id),
    createdBy: text('created_by').references(() => profiles.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('tasks_festival_id_idx').on(table.festivalId),
    index('tasks_status_idx').on(table.status),
    index('tasks_priority_idx').on(table.priority),
    index('tasks_assigned_to_idx').on(table.assignedTo),
    index('tasks_due_date_idx').on(table.dueDate),
    index('tasks_meeting_id_idx').on(table.meetingId),
  ],
);

// ─── Floor Plans ────────────────────────────────────────────────────────────
export const floorPlans = sqliteTable(
  'floor_plans',
  {
    id: id(),
    editionId: text('edition_id')
      .notNull()
      .references(() => editions.id),
    name: text('name').default('Plan principal'),
    widthPx: integer('width_px').default(1200),
    heightPx: integer('height_px').default(800),
    gridSize: integer('grid_size').default(20),
    backgroundUrl: text('background_url'),
    canvasData: text('canvas_data'), // JSON
    version: integer('version').default(1),
    createdBy: text('created_by').references(() => profiles.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('floor_plans_edition_id_idx').on(table.editionId),
  ],
);

// ─── Notifications ──────────────────────────────────────────────────────────
export const notifications = sqliteTable(
  'notifications',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => profiles.id),
    festivalId: text('festival_id').references(() => festivals.id),
    title: text('title'),
    body: text('body'),
    link: text('link'),
    channel: text('channel').default('in_app'),
    isRead: integer('is_read').default(0),
    readAt: integer('read_at'),
    createdAt: createdAt(),
  },
  (table) => [
    index('notifications_user_id_idx').on(table.userId),
    index('notifications_festival_id_idx').on(table.festivalId),
    index('notifications_is_read_idx').on(table.isRead),
    index('notifications_created_at_idx').on(table.createdAt),
  ],
);

// ─── Festival Favorites ─────────────────────────────────────────────────────
export const festivalFavorites = sqliteTable(
  'festival_favorites',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => profiles.id),
    festivalId: text('festival_id')
      .notNull()
      .references(() => festivals.id),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('festival_favorites_user_festival_idx').on(table.userId, table.festivalId),
    index('festival_favorites_user_id_idx').on(table.userId),
    index('festival_favorites_festival_id_idx').on(table.festivalId),
  ],
);

// ─── Email Campaigns ───────────────────────────────────────────────────────
export const emailCampaigns = sqliteTable(
  'email_campaigns',
  {
    id: id(),
    festivalId: text('festival_id')
      .notNull()
      .references(() => festivals.id),
    name: text('name').notNull(),
    subject: text('subject').notNull(),
    htmlBody: text('html_body').notNull().default(''),
    recipientType: text('recipient_type').notNull().default('all_members'), // all_members | specific_roles | custom
    recipientRoles: text('recipient_roles'), // JSON array of roles
    recipientIds: text('recipient_ids'), // JSON array of user IDs
    status: text('status').notNull().default('draft'), // draft | scheduled | sending | sent | failed
    scheduledAt: integer('scheduled_at'),
    sentAt: integer('sent_at'),
    sentCount: integer('sent_count').default(0),
    failedCount: integer('failed_count').default(0),
    createdBy: text('created_by').references(() => profiles.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('email_campaigns_festival_id_idx').on(table.festivalId),
    index('email_campaigns_status_idx').on(table.status),
  ],
);

// ─── Email Logs ────────────────────────────────────────────────────────────
export const emailLogs = sqliteTable(
  'email_logs',
  {
    id: id(),
    festivalId: text('festival_id')
      .notNull()
      .references(() => festivals.id),
    campaignId: text('campaign_id').references(() => emailCampaigns.id),
    toEmail: text('to_email').notNull(),
    toName: text('to_name'),
    subject: text('subject').notNull(),
    status: text('status').notNull().default('sent'),
    error: text('error'),
    sentAt: integer('sent_at'),
    createdAt: createdAt(),
  },
  (table) => [
    index('email_logs_festival_id_idx').on(table.festivalId),
    index('email_logs_campaign_id_idx').on(table.campaignId),
  ],
);

// ─── Festival Invites ─────────────────────────────────────────────────────
export const festivalInvites = sqliteTable(
  'festival_invites',
  {
    id: id(),
    festivalId: text('festival_id')
      .notNull()
      .references(() => festivals.id),
    token: text('token').notNull(),
    role: text('role').notNull().default('volunteer'),
    /** 0 = unlimited */
    maxUses: integer('max_uses').default(0),
    useCount: integer('use_count').notNull().default(0),
    expiresAt: integer('expires_at'),
    createdBy: text('created_by')
      .notNull()
      .references(() => profiles.id),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('festival_invites_token_idx').on(table.token),
    index('festival_invites_festival_id_idx').on(table.festivalId),
  ],
);

// ─── Password Reset Tokens ────────────────────────────────────────────────
export const passwordResetTokens = sqliteTable(
  'password_reset_tokens',
  {
    id: id(),
    userId: text('user_id').notNull().references(() => profiles.id),
    tokenHash: text('token_hash').notNull(),
    expiresAt: integer('expires_at').notNull(),
    usedAt: integer('used_at'),
    createdAt: createdAt(),
  },
  (table) => [
    index('password_reset_tokens_user_id_idx').on(table.userId),
    index('password_reset_tokens_token_hash_idx').on(table.tokenHash),
  ],
);

// ─── Token Blacklist (for logout) ─────────────────────────────────────────
export const tokenBlacklist = sqliteTable(
  'token_blacklist',
  {
    id: id(),
    jti: text('jti').notNull(),
    expiresAt: integer('expires_at').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('token_blacklist_jti_idx').on(table.jti),
  ],
);

// ─── Support Tickets ──────────────────────────────────────────────────────
export const supportTickets = sqliteTable(
  'support_tickets',
  {
    id: id(),
    festivalId: text('festival_id')
      .notNull()
      .references(() => festivals.id),
    userId: text('user_id').references(() => profiles.id),
    guestName: text('guest_name'),
    guestEmail: text('guest_email'),
    subject: text('subject').notNull(),
    category: text('category').notNull().default('general'), // general | technical | billing | volunteer | exhibitor | other
    priority: text('priority').notNull().default('medium'), // low | medium | high | urgent
    status: text('status').notNull().default('open'), // open | in_progress | waiting | resolved | closed
    assignedTo: text('assigned_to').references(() => profiles.id),
    closedAt: integer('closed_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('support_tickets_festival_id_idx').on(table.festivalId),
    index('support_tickets_user_id_idx').on(table.userId),
    index('support_tickets_status_idx').on(table.status),
    index('support_tickets_category_idx').on(table.category),
    index('support_tickets_assigned_to_idx').on(table.assignedTo),
  ],
);

// ─── Ticket Messages ─────────────────────────────────────────────────────
export const ticketMessages = sqliteTable(
  'ticket_messages',
  {
    id: id(),
    ticketId: text('ticket_id')
      .notNull()
      .references(() => supportTickets.id),
    senderId: text('sender_id').references(() => profiles.id),
    senderType: text('sender_type').notNull().default('user'), // user | admin | bot
    content: text('content').notNull(),
    isInternal: integer('is_internal').notNull().default(0),
    createdAt: createdAt(),
  },
  (table) => [
    index('ticket_messages_ticket_id_idx').on(table.ticketId),
    index('ticket_messages_sender_id_idx').on(table.senderId),
  ],
);

// ─── Chatbot FAQ ─────────────────────────────────────────────────────────
export const chatbotFaq = sqliteTable(
  'chatbot_faq',
  {
    id: id(),
    festivalId: text('festival_id')
      .notNull()
      .references(() => festivals.id),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    category: text('category').default('general'),
    sortOrder: integer('sort_order').default(0),
    isActive: integer('is_active').notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('chatbot_faq_festival_id_idx').on(table.festivalId),
    index('chatbot_faq_is_active_idx').on(table.isActive),
  ],
);

// ═══════════════════════════════════════════════════════════════════════════
// RELATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const profilesRelations = relations(profiles, ({ many }) => ({
  createdFestivals: many(festivals),
  festivalMemberships: many(festivalMembers),
  exhibitorProfile: many(exhibitorProfiles),
  documents: many(documents),
  shiftAssignments: many(shiftAssignments),
  notifications: many(notifications),
  festivalFavorites: many(festivalFavorites),
  passwordResetTokens: many(passwordResetTokens),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(profiles, {
    fields: [documents.userId],
    references: [profiles.id],
  }),
  reviewer: one(profiles, {
    fields: [documents.reviewedBy],
    references: [profiles.id],
    relationName: 'documentReviewer',
  }),
}));

export const festivalsRelations = relations(festivals, ({ one, many }) => ({
  createdByProfile: one(profiles, {
    fields: [festivals.createdBy],
    references: [profiles.id],
  }),
  members: many(festivalMembers),
  editions: many(editions),
  cmsPages: many(cmsPages),
  venues: many(venues),
  volunteerRoles: many(volunteerRoles),
  budgetCategories: many(budgetCategories),
  equipmentItems: many(equipmentItems),
  equipmentOwners: many(equipmentOwners),
  notifications: many(notifications),
  favorites: many(festivalFavorites),
  meetings: many(meetings),
  tasks: many(tasks),
  emailCampaigns: many(emailCampaigns),
  emailLogs: many(emailLogs),
  invites: many(festivalInvites),
  supportTickets: many(supportTickets),
  chatbotFaqs: many(chatbotFaq),
}));

export const festivalMembersRelations = relations(festivalMembers, ({ one }) => ({
  festival: one(festivals, {
    fields: [festivalMembers.festivalId],
    references: [festivals.id],
  }),
  user: one(profiles, {
    fields: [festivalMembers.userId],
    references: [profiles.id],
    relationName: 'memberUser',
  }),
  inviter: one(profiles, {
    fields: [festivalMembers.invitedBy],
    references: [profiles.id],
    relationName: 'memberInviter',
  }),
}));

export const festivalInvitesRelations = relations(festivalInvites, ({ one }) => ({
  festival: one(festivals, {
    fields: [festivalInvites.festivalId],
    references: [festivals.id],
  }),
  creator: one(profiles, {
    fields: [festivalInvites.createdBy],
    references: [profiles.id],
  }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(profiles, {
    fields: [passwordResetTokens.userId],
    references: [profiles.id],
  }),
}));

export const editionsRelations = relations(editions, ({ one, many }) => ({
  festival: one(festivals, {
    fields: [editions.festivalId],
    references: [festivals.id],
  }),
  boothTypes: many(boothTypes),
  boothLocations: many(boothLocations),
  boothApplications: many(boothApplications),
  events: many(events),
  shifts: many(shifts),
  budgetEntries: many(budgetEntries),
  equipmentAssignments: many(equipmentAssignments),
  floorPlans: many(floorPlans),
}));

export const cmsPagesRelations = relations(cmsPages, ({ one, many }) => ({
  festival: one(festivals, {
    fields: [cmsPages.festivalId],
    references: [festivals.id],
  }),
  createdByProfile: one(profiles, {
    fields: [cmsPages.createdBy],
    references: [profiles.id],
  }),
  blocks: many(cmsBlocks),
}));

export const cmsBlocksRelations = relations(cmsBlocks, ({ one }) => ({
  page: one(cmsPages, {
    fields: [cmsBlocks.pageId],
    references: [cmsPages.id],
  }),
}));

export const cmsNavigationRelations = relations(cmsNavigation, ({ one }) => ({
  festival: one(festivals, {
    fields: [cmsNavigation.festivalId],
    references: [festivals.id],
  }),
}));

export const exhibitorProfilesRelations = relations(exhibitorProfiles, ({ one, many }) => ({
  user: one(profiles, {
    fields: [exhibitorProfiles.userId],
    references: [profiles.id],
  }),
  boothApplications: many(boothApplications),
}));

export const boothTypesRelations = relations(boothTypes, ({ one, many }) => ({
  edition: one(editions, {
    fields: [boothTypes.editionId],
    references: [editions.id],
  }),
  boothLocations: many(boothLocations),
}));

export const boothLocationsRelations = relations(boothLocations, ({ one, many }) => ({
  boothType: one(boothTypes, {
    fields: [boothLocations.boothTypeId],
    references: [boothTypes.id],
  }),
  edition: one(editions, {
    fields: [boothLocations.editionId],
    references: [editions.id],
  }),
  applications: many(boothApplications),
}));

export const boothApplicationsRelations = relations(boothApplications, ({ one }) => ({
  edition: one(editions, {
    fields: [boothApplications.editionId],
    references: [editions.id],
  }),
  exhibitor: one(exhibitorProfiles, {
    fields: [boothApplications.exhibitorId],
    references: [exhibitorProfiles.id],
  }),
  reviewer: one(profiles, {
    fields: [boothApplications.reviewedBy],
    references: [profiles.id],
  }),
  assignedBooth: one(boothLocations, {
    fields: [boothApplications.assignedBoothId],
    references: [boothLocations.id],
  }),
}));

export const venuesRelations = relations(venues, ({ one, many }) => ({
  festival: one(festivals, {
    fields: [venues.festivalId],
    references: [festivals.id],
  }),
  events: many(events),
  shifts: many(shifts),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  edition: one(editions, {
    fields: [events.editionId],
    references: [editions.id],
  }),
  venue: one(venues, {
    fields: [events.venueId],
    references: [venues.id],
  }),
  createdByProfile: one(profiles, {
    fields: [events.createdBy],
    references: [profiles.id],
  }),
}));

export const volunteerRolesRelations = relations(volunteerRoles, ({ one, many }) => ({
  festival: one(festivals, {
    fields: [volunteerRoles.festivalId],
    references: [festivals.id],
  }),
  shifts: many(shifts),
}));

export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  edition: one(editions, {
    fields: [shifts.editionId],
    references: [editions.id],
  }),
  role: one(volunteerRoles, {
    fields: [shifts.roleId],
    references: [volunteerRoles.id],
  }),
  venue: one(venues, {
    fields: [shifts.venueId],
    references: [venues.id],
  }),
  assignments: many(shiftAssignments),
}));

export const shiftAssignmentsRelations = relations(shiftAssignments, ({ one }) => ({
  shift: one(shifts, {
    fields: [shiftAssignments.shiftId],
    references: [shifts.id],
  }),
  user: one(profiles, {
    fields: [shiftAssignments.userId],
    references: [profiles.id],
    relationName: 'assignmentUser',
  }),
  assigner: one(profiles, {
    fields: [shiftAssignments.assignedBy],
    references: [profiles.id],
    relationName: 'assignmentAssigner',
  }),
}));

export const budgetCategoriesRelations = relations(budgetCategories, ({ one, many }) => ({
  festival: one(festivals, {
    fields: [budgetCategories.festivalId],
    references: [festivals.id],
  }),
  entries: many(budgetEntries),
}));

export const budgetEntriesRelations = relations(budgetEntries, ({ one }) => ({
  edition: one(editions, {
    fields: [budgetEntries.editionId],
    references: [editions.id],
  }),
  category: one(budgetCategories, {
    fields: [budgetEntries.categoryId],
    references: [budgetCategories.id],
  }),
  createdByProfile: one(profiles, {
    fields: [budgetEntries.createdBy],
    references: [profiles.id],
  }),
}));

export const equipmentItemsRelations = relations(equipmentItems, ({ one, many }) => ({
  festival: one(festivals, {
    fields: [equipmentItems.festivalId],
    references: [festivals.id],
  }),
  assignments: many(equipmentAssignments),
}));

export const equipmentOwnersRelations = relations(equipmentOwners, ({ one }) => ({
  festival: one(festivals, {
    fields: [equipmentOwners.festivalId],
    references: [festivals.id],
  }),
}));

export const equipmentAssignmentsRelations = relations(equipmentAssignments, ({ one }) => ({
  item: one(equipmentItems, {
    fields: [equipmentAssignments.itemId],
    references: [equipmentItems.id],
  }),
  edition: one(editions, {
    fields: [equipmentAssignments.editionId],
    references: [editions.id],
  }),
}));

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  festival: one(festivals, {
    fields: [meetings.festivalId],
    references: [festivals.id],
  }),
  createdByProfile: one(profiles, {
    fields: [meetings.createdBy],
    references: [profiles.id],
  }),
  blocks: many(meetingBlocks),
  attendees: many(meetingAttendees),
  tasks: many(tasks),
}));

export const meetingBlocksRelations = relations(meetingBlocks, ({ one, many }) => ({
  meeting: one(meetings, {
    fields: [meetingBlocks.meetingId],
    references: [meetings.id],
  }),
  tasks: many(tasks),
}));

export const meetingAttendeesRelations = relations(meetingAttendees, ({ one }) => ({
  meeting: one(meetings, {
    fields: [meetingAttendees.meetingId],
    references: [meetings.id],
  }),
  user: one(profiles, {
    fields: [meetingAttendees.userId],
    references: [profiles.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  festival: one(festivals, {
    fields: [tasks.festivalId],
    references: [festivals.id],
  }),
  assignee: one(profiles, {
    fields: [tasks.assignedTo],
    references: [profiles.id],
    relationName: 'taskAssignee',
  }),
  creator: one(profiles, {
    fields: [tasks.createdBy],
    references: [profiles.id],
    relationName: 'taskCreator',
  }),
  meeting: one(meetings, {
    fields: [tasks.meetingId],
    references: [meetings.id],
  }),
  meetingBlock: one(meetingBlocks, {
    fields: [tasks.meetingBlockId],
    references: [meetingBlocks.id],
  }),
}));

export const floorPlansRelations = relations(floorPlans, ({ one }) => ({
  edition: one(editions, {
    fields: [floorPlans.editionId],
    references: [editions.id],
  }),
  createdByProfile: one(profiles, {
    fields: [floorPlans.createdBy],
    references: [profiles.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(profiles, {
    fields: [notifications.userId],
    references: [profiles.id],
  }),
  festival: one(festivals, {
    fields: [notifications.festivalId],
    references: [festivals.id],
  }),
}));

export const festivalFavoritesRelations = relations(festivalFavorites, ({ one }) => ({
  user: one(profiles, {
    fields: [festivalFavorites.userId],
    references: [profiles.id],
  }),
  festival: one(festivals, {
    fields: [festivalFavorites.festivalId],
    references: [festivals.id],
  }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  festival: one(festivals, {
    fields: [supportTickets.festivalId],
    references: [festivals.id],
  }),
  user: one(profiles, {
    fields: [supportTickets.userId],
    references: [profiles.id],
    relationName: 'ticketUser',
  }),
  assignee: one(profiles, {
    fields: [supportTickets.assignedTo],
    references: [profiles.id],
    relationName: 'ticketAssignee',
  }),
  messages: many(ticketMessages),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [ticketMessages.ticketId],
    references: [supportTickets.id],
  }),
  sender: one(profiles, {
    fields: [ticketMessages.senderId],
    references: [profiles.id],
  }),
}));

export const chatbotFaqRelations = relations(chatbotFaq, ({ one }) => ({
  festival: one(festivals, {
    fields: [chatbotFaq.festivalId],
    references: [festivals.id],
  }),
}));

// ─── Conversations ────────────────────────────────────────────────────────
export const conversations = sqliteTable(
  'conversations',
  {
    id: id(),
    subject: text('subject'),
    festivalId: text('festival_id').references(() => festivals.id),
    createdBy: text('created_by')
      .notNull()
      .references(() => profiles.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('conv_created_by_idx').on(table.createdBy),
    index('conv_festival_id_idx').on(table.festivalId),
    index('conv_updated_at_idx').on(table.updatedAt),
  ],
);

export const conversationParticipants = sqliteTable(
  'conversation_participants',
  {
    id: id(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => profiles.id),
    lastReadAt: integer('last_read_at'),
    joinedAt: integer('joined_at').$defaultFn(() => Math.floor(Date.now() / 1000)),
  },
  (table) => [
    uniqueIndex('conv_part_unique_idx').on(table.conversationId, table.userId),
    index('conv_part_user_idx').on(table.userId),
  ],
);

export const messages = sqliteTable(
  'messages',
  {
    id: id(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: text('sender_id')
      .notNull()
      .references(() => profiles.id),
    body: text('body').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('msg_conv_idx').on(table.conversationId),
    index('msg_sender_idx').on(table.senderId),
    index('msg_created_at_idx').on(table.createdAt),
  ],
);

// ─── POS: Product Categories ──────────────────────────────────────────────
export const productCategories = sqliteTable(
  'product_categories',
  {
    id: id(),
    exhibitorId: text('exhibitor_id')
      .notNull()
      .references(() => exhibitorProfiles.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').default('#6366f1'),
    sortOrder: integer('sort_order').default(0),
    createdAt: createdAt(),
  },
  (table) => [index('pcat_exhibitor_idx').on(table.exhibitorId)],
);

// ─── POS: Products ───────────────────────────────────────────────────────
export const products = sqliteTable(
  'products',
  {
    id: id(),
    exhibitorId: text('exhibitor_id')
      .notNull()
      .references(() => exhibitorProfiles.id, { onDelete: 'cascade' }),
    categoryId: text('category_id').references(() => productCategories.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    description: text('description'),
    sku: text('sku'),
    imageUrl: text('image_url'),
    priceCents: integer('price_cents').notNull().default(0),
    costCents: integer('cost_cents').notNull().default(0),
    taxRate: real('tax_rate').notNull().default(0), // e.g. 0.20 for 20%
    stockQuantity: integer('stock_quantity').notNull().default(0),
    stockAlertThreshold: integer('stock_alert_threshold').default(5),
    isActive: integer('is_active').notNull().default(1),
    isOnline: integer('is_online').notNull().default(0),
    weightGrams: integer('weight_grams'),
    sortOrder: integer('sort_order').default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('prod_exhibitor_idx').on(table.exhibitorId),
    index('prod_category_idx').on(table.categoryId),
    index('prod_sku_idx').on(table.sku),
    index('prod_active_idx').on(table.isActive),
  ],
);

// ─── POS: Coupons ────────────────────────────────────────────────────────
export const coupons = sqliteTable(
  'coupons',
  {
    id: id(),
    exhibitorId: text('exhibitor_id')
      .notNull()
      .references(() => exhibitorProfiles.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    label: text('label'),
    discountType: text('discount_type').notNull().default('percentage'), // percentage | fixed
    discountValue: real('discount_value').notNull().default(0),
    minAmountCents: integer('min_amount_cents').default(0),
    maxUses: integer('max_uses'),
    usedCount: integer('used_count').notNull().default(0),
    validFrom: integer('valid_from'),
    validUntil: integer('valid_until'),
    isActive: integer('is_active').notNull().default(1),
    createdAt: createdAt(),
  },
  (table) => [
    index('coupon_exhibitor_idx').on(table.exhibitorId),
    uniqueIndex('coupon_code_exhibitor_idx').on(table.exhibitorId, table.code),
  ],
);

// ─── POS: Sales ──────────────────────────────────────────────────────────
export const sales = sqliteTable(
  'sales',
  {
    id: id(),
    exhibitorId: text('exhibitor_id')
      .notNull()
      .references(() => exhibitorProfiles.id, { onDelete: 'cascade' }),
    editionId: text('edition_id').references(() => editions.id),
    saleNumber: integer('sale_number').notNull(),
    subtotalCents: integer('subtotal_cents').notNull().default(0),
    discountCents: integer('discount_cents').notNull().default(0),
    taxCents: integer('tax_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull().default(0),
    paymentMethod: text('payment_method').notNull().default('cash'),
    couponId: text('coupon_id').references(() => coupons.id),
    customerName: text('customer_name'),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  (table) => [
    index('sale_exhibitor_idx').on(table.exhibitorId),
    index('sale_edition_idx').on(table.editionId),
    index('sale_date_idx').on(table.createdAt),
  ],
);

// ─── POS: Sale Items ─────────────────────────────────────────────────────
export const saleItems = sqliteTable(
  'sale_items',
  {
    id: id(),
    saleId: text('sale_id')
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    productId: text('product_id').references(() => products.id),
    productName: text('product_name').notNull(),
    quantity: integer('quantity').notNull().default(1),
    unitPriceCents: integer('unit_price_cents').notNull().default(0),
    discountCents: integer('discount_cents').notNull().default(0),
    taxCents: integer('tax_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull().default(0),
  },
  (table) => [
    index('sitem_sale_idx').on(table.saleId),
    index('sitem_product_idx').on(table.productId),
  ],
);

// ─── Exhibitor Expenses ──────────────────────────────────────────────────
export const exhibitorExpenses = sqliteTable(
  'exhibitor_expenses',
  {
    id: id(),
    exhibitorId: text('exhibitor_id')
      .notNull()
      .references(() => exhibitorProfiles.id, { onDelete: 'cascade' }),
    editionId: text('edition_id').references(() => editions.id),
    category: text('category').notNull().default('other'),
    label: text('label').notNull(),
    amountCents: integer('amount_cents').notNull().default(0),
    date: text('date'),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  (table) => [
    index('exp_exhibitor_idx').on(table.exhibitorId),
    index('exp_edition_idx').on(table.editionId),
  ],
);

// ─── Invoices ─────────────────────────────────────────────────────────────
export const invoices = sqliteTable(
  'invoices',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => profiles.id),
    festivalId: text('festival_id').references(() => festivals.id),
    editionId: text('edition_id').references(() => editions.id),
    applicationId: text('application_id').references(() => boothApplications.id),
    invoiceNumber: text('invoice_number').notNull(),
    label: text('label').notNull(),
    amountCents: integer('amount_cents').notNull().default(0),
    taxCents: integer('tax_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull().default(0),
    currency: text('currency').notNull().default('EUR'),
    status: text('status').notNull().default('draft'), // draft | sent | paid | overdue | cancelled
    issuedAt: integer('issued_at'),
    dueAt: integer('due_at'),
    paidAt: integer('paid_at'),
    pdfUrl: text('pdf_url'),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('inv_user_idx').on(table.userId),
    index('inv_festival_idx').on(table.festivalId),
    index('inv_status_idx').on(table.status),
    index('inv_number_idx').on(table.invoiceNumber),
  ],
);

// ═══════════════════════════════════════════════════════════════════════════
// BILLETTERIE
// ═══════════════════════════════════════════════════════════════════════════

export const ticketTypes = sqliteTable('ticket_types', {
  id: id(), editionId: text('edition_id').notNull().references(() => editions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), description: text('description'),
  priceCents: integer('price_cents').notNull().default(0),
  quantityTotal: integer('quantity_total').notNull().default(0),
  quantitySold: integer('quantity_sold').notNull().default(0),
  maxPerOrder: integer('max_per_order').default(10),
  saleStart: integer('sale_start'), saleEnd: integer('sale_end'),
  validFrom: integer('valid_from'), validUntil: integer('valid_until'),
  isActive: integer('is_active').notNull().default(1),
  color: text('color').default('#6366f1'), sortOrder: integer('sort_order').default(0),
  createdAt: createdAt(),
}, (t) => [index('ttype_edition_idx').on(t.editionId)]);

export const tickets = sqliteTable('tickets', {
  id: id(), ticketTypeId: text('ticket_type_id').notNull().references(() => ticketTypes.id),
  editionId: text('edition_id').notNull().references(() => editions.id),
  buyerEmail: text('buyer_email').notNull(), buyerName: text('buyer_name'), buyerPhone: text('buyer_phone'),
  qrCode: text('qr_code').notNull().unique(), status: text('status').notNull().default('valid'),
  orderRef: text('order_ref'), amountPaidCents: integer('amount_paid_cents').notNull().default(0),
  paymentMethod: text('payment_method'),
  scannedAt: integer('scanned_at'), scannedBy: text('scanned_by').references(() => profiles.id),
  notes: text('notes'), createdAt: createdAt(),
}, (t) => [index('ticket_edition_idx').on(t.editionId), index('ticket_qr_idx').on(t.qrCode), index('ticket_status_idx').on(t.status)]);

// ═══════════════════════════════════════════════════════════════════════════
// MARKETPLACE
// ═══════════════════════════════════════════════════════════════════════════

export const orders = sqliteTable('orders', {
  id: id(), orderNumber: text('order_number').notNull().unique(),
  buyerId: text('buyer_id').references(() => profiles.id),
  buyerEmail: text('buyer_email').notNull(), buyerName: text('buyer_name'),
  editionId: text('edition_id').references(() => editions.id),
  subtotalCents: integer('subtotal_cents').notNull().default(0),
  shippingCents: integer('shipping_cents').notNull().default(0),
  taxCents: integer('tax_cents').notNull().default(0),
  totalCents: integer('total_cents').notNull().default(0),
  status: text('status').notNull().default('pending'),
  paymentStatus: text('payment_status').notNull().default('unpaid'),
  paymentMethod: text('payment_method'), shippingAddress: text('shipping_address'),
  notes: text('notes'), createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [index('order_buyer_idx').on(t.buyerId), index('order_status_idx').on(t.status)]);

export const orderItems = sqliteTable('order_items', {
  id: id(), orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id),
  exhibitorId: text('exhibitor_id').notNull().references(() => exhibitorProfiles.id),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPriceCents: integer('unit_price_cents').notNull().default(0),
  totalCents: integer('total_cents').notNull().default(0),
  status: text('status').notNull().default('pending'), createdAt: createdAt(),
}, (t) => [index('oitem_order_idx').on(t.orderId), index('oitem_exhibitor_idx').on(t.exhibitorId)]);

// ═══════════════════════════════════════════════════════════════════════════
// SPONSORS
// ═══════════════════════════════════════════════════════════════════════════

export const sponsorTiers = sqliteTable('sponsor_tiers', {
  id: id(), festivalId: text('festival_id').notNull().references(() => festivals.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), level: integer('level').notNull().default(0),
  priceCents: integer('price_cents').default(0), benefits: text('benefits'),
  color: text('color').default('#f59e0b'), maxSponsors: integer('max_sponsors'),
  sortOrder: integer('sort_order').default(0), createdAt: createdAt(),
}, (t) => [index('stier_festival_idx').on(t.festivalId)]);

export const sponsors = sqliteTable('sponsors', {
  id: id(), festivalId: text('festival_id').notNull().references(() => festivals.id, { onDelete: 'cascade' }),
  tierId: text('tier_id').references(() => sponsorTiers.id),
  companyName: text('company_name').notNull(), logoUrl: text('logo_url'),
  website: text('website'), description: text('description'),
  contactName: text('contact_name'), contactEmail: text('contact_email'), contactPhone: text('contact_phone'),
  amountCents: integer('amount_cents').default(0), isPaid: integer('is_paid').default(0),
  contractUrl: text('contract_url'), isActive: integer('is_active').notNull().default(1),
  sortOrder: integer('sort_order').default(0), createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [index('sponsor_festival_idx').on(t.festivalId), index('sponsor_tier_idx').on(t.tierId)]);

// ═══════════════════════════════════════════════════════════════════════════
// RESERVATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const bookableSlots = sqliteTable('bookable_slots', {
  id: id(), editionId: text('edition_id').notNull().references(() => editions.id, { onDelete: 'cascade' }),
  eventId: text('event_id').references(() => events.id),
  title: text('title').notNull(), description: text('description'), location: text('location'),
  startTime: integer('start_time').notNull(), endTime: integer('end_time').notNull(),
  capacity: integer('capacity').notNull().default(1), bookedCount: integer('booked_count').notNull().default(0),
  priceCents: integer('price_cents').default(0), requiresTicket: integer('requires_ticket').default(0),
  isActive: integer('is_active').notNull().default(1), createdAt: createdAt(),
}, (t) => [index('bslot_edition_idx').on(t.editionId)]);

export const slotReservations = sqliteTable('slot_reservations', {
  id: id(), slotId: text('slot_id').notNull().references(() => bookableSlots.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => profiles.id),
  guestName: text('guest_name'), guestEmail: text('guest_email'),
  status: text('status').notNull().default('confirmed'),
  qrCode: text('qr_code').unique(), createdAt: createdAt(),
}, (t) => [index('sres_slot_idx').on(t.slotId), index('sres_user_idx').on(t.userId)]);

// ═══════════════════════════════════════════════════════════════════════════
// GAMIFICATION
// ═══════════════════════════════════════════════════════════════════════════

export const stampCards = sqliteTable('stamp_cards', {
  id: id(), editionId: text('edition_id').notNull().references(() => editions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), description: text('description'),
  requiredStamps: integer('required_stamps').notNull().default(5),
  rewardDescription: text('reward_description'),
  isActive: integer('is_active').notNull().default(1), createdAt: createdAt(),
}, (t) => [index('scard_edition_idx').on(t.editionId)]);

export const stamps = sqliteTable('stamps', {
  id: id(), stampCardId: text('stamp_card_id').notNull().references(() => stampCards.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => profiles.id),
  exhibitorId: text('exhibitor_id').references(() => exhibitorProfiles.id),
  boothCode: text('booth_code'), scannedAt: integer('scanned_at').$defaultFn(() => Math.floor(Date.now() / 1000)),
}, (t) => [index('stamp_card_idx').on(t.stampCardId), index('stamp_user_idx').on(t.userId)]);

export const badges = sqliteTable('badges', {
  id: id(), editionId: text('edition_id').notNull().references(() => editions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), description: text('description'),
  icon: text('icon'), color: text('color').default('#f59e0b'),
  conditionType: text('condition_type').notNull(), conditionValue: integer('condition_value').default(1),
  createdAt: createdAt(),
}, (t) => [index('badge_edition_idx').on(t.editionId)]);

export const userBadges = sqliteTable('user_badges', {
  id: id(), badgeId: text('badge_id').notNull().references(() => badges.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => profiles.id),
  earnedAt: integer('earned_at').$defaultFn(() => Math.floor(Date.now() / 1000)),
}, (t) => [uniqueIndex('ubadge_unique_idx').on(t.badgeId, t.userId)]);

export const treasureHunts = sqliteTable('treasure_hunts', {
  id: id(), editionId: text('edition_id').notNull().references(() => editions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), description: text('description'),
  rewardDescription: text('reward_description'), totalCheckpoints: integer('total_checkpoints').notNull().default(0),
  isActive: integer('is_active').notNull().default(1), createdAt: createdAt(),
}, (t) => [index('thunt_edition_idx').on(t.editionId)]);

export const treasureHuntCheckpoints = sqliteTable('treasure_hunt_checkpoints', {
  id: id(), huntId: text('hunt_id').notNull().references(() => treasureHunts.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), hint: text('hint'),
  qrCode: text('qr_code').notNull().unique(), sortOrder: integer('sort_order').default(0),
}, (t) => [index('tchk_hunt_idx').on(t.huntId)]);

export const treasureHuntProgress = sqliteTable('treasure_hunt_progress', {
  id: id(), huntId: text('hunt_id').notNull().references(() => treasureHunts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => profiles.id),
  checkpointId: text('checkpoint_id').notNull().references(() => treasureHuntCheckpoints.id),
  foundAt: integer('found_at').$defaultFn(() => Math.floor(Date.now() / 1000)),
}, (t) => [uniqueIndex('thprog_unique_idx').on(t.huntId, t.userId, t.checkpointId)]);

// ═══════════════════════════════════════════════════════════════════════════
// VOTES
// ═══════════════════════════════════════════════════════════════════════════

export const voteCategories = sqliteTable('vote_categories', {
  id: id(), editionId: text('edition_id').notNull().references(() => editions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), description: text('description'),
  votingStart: integer('voting_start'), votingEnd: integer('voting_end'),
  maxVotesPerUser: integer('max_votes_per_user').default(1),
  isActive: integer('is_active').notNull().default(1), createdAt: createdAt(),
}, (t) => [index('vcat_edition_idx').on(t.editionId)]);

export const votes = sqliteTable('votes', {
  id: id(), voteCategoryId: text('vote_category_id').notNull().references(() => voteCategories.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => profiles.id),
  targetType: text('target_type').notNull(), targetId: text('target_id').notNull(),
  rating: integer('rating').default(0), comment: text('comment'), createdAt: createdAt(),
}, (t) => [index('vote_cat_idx').on(t.voteCategoryId), index('vote_target_idx').on(t.targetType, t.targetId)]);

// ═══════════════════════════════════════════════════════════════════════════
// RAFFLES (Tombola)
// ═══════════════════════════════════════════════════════════════════════════

export const raffles = sqliteTable('raffles', {
  id: id(), editionId: text('edition_id').notNull().references(() => editions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), description: text('description'),
  drawDate: integer('draw_date'), isDrawn: integer('is_drawn').notNull().default(0),
  isActive: integer('is_active').notNull().default(1), createdAt: createdAt(),
}, (t) => [index('raffle_edition_idx').on(t.editionId)]);

export const rafflePrizes = sqliteTable('raffle_prizes', {
  id: id(), raffleId: text('raffle_id').notNull().references(() => raffles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), description: text('description'),
  imageUrl: text('image_url'), sponsor: text('sponsor'), sortOrder: integer('sort_order').default(0),
  winnerId: text('winner_id').references(() => profiles.id), winnerName: text('winner_name'),
}, (t) => [index('rprize_raffle_idx').on(t.raffleId)]);

export const raffleEntries = sqliteTable('raffle_entries', {
  id: id(), raffleId: text('raffle_id').notNull().references(() => raffles.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => profiles.id),
  guestName: text('guest_name'), guestEmail: text('guest_email'),
  entryCode: text('entry_code').unique(), createdAt: createdAt(),
}, (t) => [index('rentry_raffle_idx').on(t.raffleId)]);

// ═══════════════════════════════════════════════════════════════════════════
// ARTISTS / GUESTS
// ═══════════════════════════════════════════════════════════════════════════

export const artists = sqliteTable('artists', {
  id: id(), editionId: text('edition_id').notNull().references(() => editions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), bio: text('bio'), photoUrl: text('photo_url'),
  website: text('website'), socialLinks: text('social_links'), category: text('category'), role: text('role'),
  feeCents: integer('fee_cents').default(0), isPaid: integer('is_paid').default(0),
  travelInfo: text('travel_info'), accommodation: text('accommodation'),
  technicalRider: text('technical_rider'), dietaryRequirements: text('dietary_requirements'),
  arrivalDate: text('arrival_date'), departureDate: text('departure_date'),
  isPublic: integer('is_public').notNull().default(1), sortOrder: integer('sort_order').default(0),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [index('artist_edition_idx').on(t.editionId)]);

// ═══════════════════════════════════════════════════════════════════════════
// VIRTUAL QUEUES
// ═══════════════════════════════════════════════════════════════════════════

export const virtualQueues = sqliteTable('virtual_queues', {
  id: id(), editionId: text('edition_id').notNull().references(() => editions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), description: text('description'), location: text('location'),
  isActive: integer('is_active').notNull().default(1),
  avgServiceMinutes: integer('avg_service_minutes').default(5), createdAt: createdAt(),
}, (t) => [index('vqueue_edition_idx').on(t.editionId)]);

export const queueEntries = sqliteTable('queue_entries', {
  id: id(), queueId: text('queue_id').notNull().references(() => virtualQueues.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => profiles.id), guestName: text('guest_name'),
  position: integer('position').notNull(), status: text('status').notNull().default('waiting'),
  ticketCode: text('ticket_code').unique(),
  joinedAt: integer('joined_at').$defaultFn(() => Math.floor(Date.now() / 1000)),
  calledAt: integer('called_at'), servedAt: integer('served_at'),
}, (t) => [index('qentry_queue_idx').on(t.queueId), index('qentry_status_idx').on(t.status)]);

// ═══════════════════════════════════════════════════════════════════════════
// API KEYS & WEBHOOKS
// ═══════════════════════════════════════════════════════════════════════════

export const apiKeys = sqliteTable('api_keys', {
  id: id(), festivalId: text('festival_id').notNull().references(() => festivals.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), keyHash: text('key_hash').notNull(), keyPrefix: text('key_prefix').notNull(),
  permissions: text('permissions').default('[]'),
  lastUsedAt: integer('last_used_at'), expiresAt: integer('expires_at'),
  isActive: integer('is_active').notNull().default(1),
  createdBy: text('created_by').notNull().references(() => profiles.id), createdAt: createdAt(),
}, (t) => [index('apikey_festival_idx').on(t.festivalId), index('apikey_prefix_idx').on(t.keyPrefix)]);

export const webhooksTable = sqliteTable('webhooks', {
  id: id(), festivalId: text('festival_id').notNull().references(() => festivals.id, { onDelete: 'cascade' }),
  url: text('url').notNull(), events: text('events').notNull(),
  secret: text('secret'), isActive: integer('is_active').notNull().default(1),
  lastTriggeredAt: integer('last_triggered_at'), failureCount: integer('failure_count').default(0),
  createdAt: createdAt(),
}, (t) => [index('webhook_festival_idx').on(t.festivalId)]);

export const webhookLogs = sqliteTable('webhook_logs', {
  id: id(), webhookId: text('webhook_id').notNull().references(() => webhooksTable.id, { onDelete: 'cascade' }),
  event: text('event').notNull(), payload: text('payload'),
  responseStatus: integer('response_status'), responseBody: text('response_body'),
  durationMs: integer('duration_ms'), createdAt: createdAt(),
}, (t) => [index('whlog_webhook_idx').on(t.webhookId)]);

// ═══════════════════════════════════════════════════════════════════════════
// VISITOR FEATURES
// ═══════════════════════════════════════════════════════════════════════════

export const festivalVisits = sqliteTable('festival_visits', {
  id: id(), userId: text('user_id').notNull().references(() => profiles.id),
  festivalId: text('festival_id').notNull().references(() => festivals.id),
  editionId: text('edition_id').references(() => editions.id),
  visitedAt: integer('visited_at').$defaultFn(() => Math.floor(Date.now() / 1000)),
}, (t) => [
  uniqueIndex('fvisit_unique_idx').on(t.userId, t.editionId),
  index('fvisit_user_idx').on(t.userId),
]);

export const festivalReviews = sqliteTable('festival_reviews', {
  id: id(), userId: text('user_id').notNull().references(() => profiles.id),
  festivalId: text('festival_id').notNull().references(() => festivals.id),
  editionId: text('edition_id').references(() => editions.id),
  overallRating: integer('overall_rating').notNull(),
  organisationRating: integer('organisation_rating'),
  programmeRating: integer('programme_rating'),
  standsRating: integer('stands_rating'),
  ambianceRating: integer('ambiance_rating'),
  foodRating: integer('food_rating'),
  accessibilityRating: integer('accessibility_rating'),
  valueRating: integer('value_rating'),
  npsScore: integer('nps_score'),
  wouldReturn: integer('would_return').default(1),
  comment: text('comment'), suggestions: text('suggestions'),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex('freview_unique_idx').on(t.userId, t.editionId),
  index('freview_festival_idx').on(t.festivalId),
]);

export const exhibitorFavorites = sqliteTable('exhibitor_favorites', {
  id: id(), userId: text('user_id').notNull().references(() => profiles.id),
  exhibitorId: text('exhibitor_id').notNull().references(() => exhibitorProfiles.id),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex('exfav_unique_idx').on(t.userId, t.exhibitorId),
  index('exfav_user_idx').on(t.userId),
]);

export const xpLogs = sqliteTable('xp_logs', {
  id: id(), userId: text('user_id').notNull().references(() => profiles.id),
  action: text('action').notNull(),
  xpEarned: integer('xp_earned').notNull().default(0),
  coinsEarned: integer('coins_earned').notNull().default(0),
  description: text('description'),
  referenceType: text('reference_type'), referenceId: text('reference_id'),
  createdAt: createdAt(),
}, (t) => [index('xplog_user_idx').on(t.userId)]);

// ═══════════════════════════════════════════════════════════════════════════
// QR OBJECTS (universal scannable items)
// ═══════════════════════════════════════════════════════════════════════════

export const qrObjects = sqliteTable('qr_objects', {
  id: id(), editionId: text('edition_id').notNull().references(() => editions.id, { onDelete: 'cascade' }),
  type: text('type').notNull().default('custom'),
  name: text('name').notNull(), description: text('description'), imageUrl: text('image_url'),
  qrCode: text('qr_code').notNull().unique(),
  maxScans: integer('max_scans'), maxScansPerUser: integer('max_scans_per_user').default(1),
  scanCount: integer('scan_count').notNull().default(0),
  xpReward: integer('xp_reward').notNull().default(0),
  coinsReward: integer('coins_reward').notNull().default(0),
  isConsumable: integer('is_consumable').notNull().default(0),
  isActive: integer('is_active').notNull().default(1),
  validFrom: integer('valid_from'), validUntil: integer('valid_until'),
  metadata: text('metadata').default('{}'), batchId: text('batch_id'),
  createdBy: text('created_by').notNull().references(() => profiles.id),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [
  index('qrobj_edition_idx').on(t.editionId),
  index('qrobj_type_idx').on(t.type),
  index('qrobj_qr_idx').on(t.qrCode),
  index('qrobj_batch_idx').on(t.batchId),
]);

export const qrScans = sqliteTable('qr_scans', {
  id: id(), qrObjectId: text('qr_object_id').notNull().references(() => qrObjects.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => profiles.id),
  guestName: text('guest_name'),
  status: text('status').notNull().default('success'),
  scannedAt: integer('scanned_at').$defaultFn(() => Math.floor(Date.now() / 1000)),
}, (t) => [index('qrscan_obj_idx').on(t.qrObjectId), index('qrscan_user_idx').on(t.userId)]);

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════════════════════════════════════════════

export const auditLogs = sqliteTable('audit_logs', {
  id: id(), userId: text('user_id').references(() => profiles.id),
  action: text('action').notNull(),
  resourceType: text('resource_type'), resourceId: text('resource_id'),
  ipAddress: text('ip_address'), userAgent: text('user_agent'),
  details: text('details'), createdAt: createdAt(),
}, (t) => [index('audit_user_idx').on(t.userId), index('audit_action_idx').on(t.action)]);
