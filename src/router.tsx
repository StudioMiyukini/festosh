import { createBrowserRouter, type RouteObject } from 'react-router-dom';

// Layouts stay eager — they wrap every page, are small, and rendering an empty
// shell while the route's lazy chunk loads is fine. The page components below
// are lazy-imported so the initial bundle only contains the entry point.
import { PlatformLayout } from '@/layouts/PlatformLayout';
import { FestivalPublicLayout } from '@/layouts/FestivalPublicLayout';
import { FestivalAdminLayout } from '@/layouts/FestivalAdminLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { PlatformAdminLayout } from '@/layouts/PlatformAdminLayout';
import { ExhibitorPublicLayout } from '@/layouts/ExhibitorPublicLayout';
import { NotFoundPage } from '@/pages/platform/NotFoundPage';

/**
 * Helper: turn a dynamic `import('@/...')` + a named export into the shape
 * React Router v7's `lazy` property expects (`{ Component }` or `{ Element }`).
 *
 * Usage: `lazy(() => import('@/pages/...'), m => m.HomePage)`.
 *
 * Why not React.lazy? The router's own `lazy` route property integrates with
 * loaders + actions and doesn't require a wrapping `<Suspense>` — simpler.
 */
function lazy<M extends Record<string, unknown>>(
  loader: () => Promise<M>,
  pick: (m: M) => unknown,
): RouteObject['lazy'] {
  return async () => ({ Component: pick(await loader()) as React.ComponentType });
}

export const router = createBrowserRouter([
  // ─── Auth routes ────────────────────────────────────────────────────────
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', lazy: lazy(() => import('@/pages/platform/LoginPage'), (m) => m.LoginPage) },
      { path: '/signup', lazy: lazy(() => import('@/pages/platform/SignupPage'), (m) => m.SignupPage) },
      { path: '/forgot-password', lazy: lazy(() => import('@/pages/platform/ForgotPasswordPage'), (m) => m.ForgotPasswordPage) },
      { path: '/reset-password/:token', lazy: lazy(() => import('@/pages/platform/ResetPasswordPage'), (m) => m.ResetPasswordPage) },
    ],
  },

  // ─── Main platform routes ──────────────────────────────────────────────
  {
    element: <PlatformLayout />,
    children: [
      { path: '/', lazy: lazy(() => import('@/pages/platform/HomePage'), (m) => m.HomePage) },
      { path: '/directory', lazy: lazy(() => import('@/pages/platform/DirectoryPage'), (m) => m.DirectoryPage) },
      { path: '/dashboard', lazy: lazy(() => import('@/pages/platform/DashboardPage'), (m) => m.DashboardPage) },
      { path: '/profile', lazy: lazy(() => import('@/pages/platform/ProfilePage'), (m) => m.ProfilePage) },
      { path: '/messaging', lazy: lazy(() => import('@/pages/platform/MessagingPage'), (m) => m.MessagingPage) },
      { path: '/exhibitor', lazy: lazy(() => import('@/pages/platform/ExhibitorDashboardPage'), (m) => m.ExhibitorDashboardPage) },
      { path: '/exhibitor/cms/:pageId', lazy: lazy(() => import('@/pages/platform/ExhibitorCmsEditorPage'), (m) => m.ExhibitorCmsEditorPage) },
      { path: '/exhibitors', lazy: lazy(() => import('@/pages/platform/ExhibitorDirectoryPage'), (m) => m.ExhibitorDirectoryPage) },
      { path: '/pos', lazy: lazy(() => import('@/pages/platform/PosTerminalPage'), (m) => m.PosTerminalPage) },
      { path: '/pos/products', lazy: lazy(() => import('@/pages/platform/PosProductsPage'), (m) => m.PosProductsPage) },
      { path: '/pos/accounting', lazy: lazy(() => import('@/pages/platform/PosAccountingPage'), (m) => m.PosAccountingPage) },
      { path: '/visitor', lazy: lazy(() => import('@/pages/platform/VisitorDashboardPage'), (m) => m.VisitorDashboardPage) },
      { path: '/scan', lazy: lazy(() => import('@/pages/platform/QrScannerPage'), (m) => m.QrScannerPage) },
      { path: '/pricing', lazy: lazy(() => import('@/pages/platform/PricingPage'), (m) => m.PricingPage) },
      { path: '/subscription', lazy: lazy(() => import('@/pages/platform/SubscriptionPage'), (m) => m.SubscriptionPage) },
      { path: '/billing', lazy: lazy(() => import('@/pages/platform/BillingPage'), (m) => m.BillingPage) },
      { path: '/volunteer', lazy: lazy(() => import('@/pages/platform/VolunteerDashboardPage'), (m) => m.VolunteerDashboardPage) },
      { path: '/organizer', lazy: lazy(() => import('@/pages/platform/OrganizerDashboardPage'), (m) => m.OrganizerDashboardPage) },
      { path: '/privacy', lazy: lazy(() => import('@/pages/platform/PrivacyPage'), (m) => m.PrivacyPage) },
      { path: '/about', lazy: lazy(() => import('@/pages/platform/AboutPage'), (m) => m.AboutPage) },
      { path: '/docs', lazy: lazy(() => import('@/pages/platform/DocsPage'), (m) => m.DocsPage) },
      { path: '/docs/visitor', lazy: lazy(() => import('@/pages/platform/docs/DocsVisitorPage'), (m) => m.DocsVisitorPage) },
      { path: '/docs/volunteer', lazy: lazy(() => import('@/pages/platform/docs/DocsVolunteerPage'), (m) => m.DocsVolunteerPage) },
      { path: '/docs/exhibitor', lazy: lazy(() => import('@/pages/platform/docs/DocsExhibitorPage'), (m) => m.DocsExhibitorPage) },
      { path: '/docs/organizer', lazy: lazy(() => import('@/pages/platform/docs/DocsOrganizerPage'), (m) => m.DocsOrganizerPage) },
    ],
  },

  // ─── Order confirmation (standalone) ───────────────────────────────────
  {
    element: <PlatformLayout />,
    children: [
      { path: '/order/:orderNumber', lazy: lazy(() => import('@/pages/exhibitor-public/OrderConfirmationPage'), (m) => m.OrderConfirmationPage) },
    ],
  },

  // ─── Public exhibitor (vitrine + boutique) ─────────────────────────────
  {
    path: '/e/:slug',
    element: <ExhibitorPublicLayout />,
    children: [
      { index: true, lazy: lazy(() => import('@/pages/exhibitor-public/ExhibitorVitrinePage'), (m) => m.ExhibitorVitrinePage) },
      { path: 'boutique', lazy: lazy(() => import('@/pages/exhibitor-public/ExhibitorBoutiquePage'), (m) => m.ExhibitorBoutiquePage) },
      { path: 'p/:productSlug', lazy: lazy(() => import('@/pages/exhibitor-public/ExhibitorProductPage'), (m) => m.ExhibitorProductPage) },
      { path: 'checkout', lazy: lazy(() => import('@/pages/exhibitor-public/ExhibitorCheckoutPage'), (m) => m.ExhibitorCheckoutPage) },
    ],
  },

  // ─── Festival public routes ────────────────────────────────────────────
  {
    path: '/f/:slug',
    element: <FestivalPublicLayout />,
    children: [
      { index: true, lazy: lazy(() => import('@/pages/festival/FestivalHomePage'), (m) => m.FestivalHomePage) },
      { path: 'schedule', lazy: lazy(() => import('@/pages/festival/FestivalSchedulePage'), (m) => m.FestivalSchedulePage) },
      { path: 'map', lazy: lazy(() => import('@/pages/festival/FestivalMapPage'), (m) => m.FestivalMapPage) },
      { path: 'exhibitors', lazy: lazy(() => import('@/pages/festival/FestivalExhibitorsPage'), (m) => m.FestivalExhibitorsPage) },
      { path: 'apply', lazy: lazy(() => import('@/pages/festival/FestivalApplyPage'), (m) => m.FestivalApplyPage) },
      { path: 'p/:pageSlug', lazy: lazy(() => import('@/pages/festival/CmsPublicPage'), (m) => m.CmsPublicPage) },
      { path: 'survey/:surveyId', lazy: lazy(() => import('@/pages/festival/SurveyFillPage'), (m) => m.SurveyFillPage) },
      { path: 'regulations', lazy: lazy(() => import('@/pages/festival/FestivalRegulationsPage'), (m) => m.FestivalRegulationsPage) },
    ],
  },

  // ─── Festival admin routes ─────────────────────────────────────────────
  {
    path: '/f/:slug/admin',
    element: <FestivalAdminLayout />,
    children: [
      { index: true, lazy: lazy(() => import('@/pages/festival-admin/AdminOverviewPage'), (m) => m.AdminOverviewPage) },
      { path: 'cms', lazy: lazy(() => import('@/pages/festival-admin/AdminCmsPage'), (m) => m.AdminCmsPage) },
      { path: 'cms/pages/:pageId', lazy: lazy(() => import('@/pages/festival-admin/AdminCmsEditorPage'), (m) => m.AdminCmsEditorPage) },
      { path: 'programming', lazy: lazy(() => import('@/pages/festival-admin/AdminProgrammingPage'), (m) => m.AdminProgrammingPage) },
      { path: 'exhibitors', lazy: lazy(() => import('@/pages/festival-admin/AdminExhibitorsPage'), (m) => m.AdminExhibitorsPage) },
      { path: 'volunteers', lazy: lazy(() => import('@/pages/festival-admin/AdminVolunteersPage'), (m) => m.AdminVolunteersPage) },
      { path: 'budget', lazy: lazy(() => import('@/pages/festival-admin/AdminBudgetPage'), (m) => m.AdminBudgetPage) },
      { path: 'equipment', lazy: lazy(() => import('@/pages/festival-admin/AdminEquipmentPage'), (m) => m.AdminEquipmentPage) },
      { path: 'agenda', lazy: lazy(() => import('@/pages/festival-admin/AdminAgendaPage'), (m) => m.AdminAgendaPage) },
      { path: 'tasks', lazy: lazy(() => import('@/pages/festival-admin/AdminTasksMeetingsPage'), (m) => m.AdminTasksMeetingsPage) },
      { path: 'floor-plan', lazy: lazy(() => import('@/pages/festival-admin/AdminFloorPlanEditorPage'), (m) => m.AdminFloorPlanEditorPage) },
      { path: 'tickets', lazy: lazy(() => import('@/pages/festival-admin/AdminTicketsPage'), (m) => m.AdminTicketsPage) },
      { path: 'ticketing', lazy: lazy(() => import('@/pages/festival-admin/AdminTicketingPage'), (m) => m.AdminTicketingPage) },
      { path: 'marketplace', lazy: lazy(() => import('@/pages/festival-admin/AdminMarketplacePage'), (m) => m.AdminMarketplacePage) },
      { path: 'sponsors', lazy: lazy(() => import('@/pages/festival-admin/AdminSponsorsPage'), (m) => m.AdminSponsorsPage) },
      { path: 'reservations', lazy: lazy(() => import('@/pages/festival-admin/AdminReservationsPage'), (m) => m.AdminReservationsPage) },
      { path: 'gamification', lazy: lazy(() => import('@/pages/festival-admin/AdminGamificationPage'), (m) => m.AdminGamificationPage) },
      { path: 'votes', lazy: lazy(() => import('@/pages/festival-admin/AdminVotesPage'), (m) => m.AdminVotesPage) },
      { path: 'raffles', lazy: lazy(() => import('@/pages/festival-admin/AdminRafflesPage'), (m) => m.AdminRafflesPage) },
      { path: 'artists', lazy: lazy(() => import('@/pages/festival-admin/AdminArtistsPage'), (m) => m.AdminArtistsPage) },
      { path: 'queues', lazy: lazy(() => import('@/pages/festival-admin/AdminQueuesPage'), (m) => m.AdminQueuesPage) },
      { path: 'analytics', lazy: lazy(() => import('@/pages/festival-admin/AdminAnalyticsPage'), (m) => m.AdminAnalyticsPage) },
      { path: 'api', lazy: lazy(() => import('@/pages/festival-admin/AdminApiPage'), (m) => m.AdminApiPage) },
      { path: 'qr-objects', lazy: lazy(() => import('@/pages/festival-admin/AdminQrObjectsPage'), (m) => m.AdminQrObjectsPage) },
      { path: 'roles', lazy: lazy(() => import('@/pages/festival-admin/AdminRolesPage'), (m) => m.AdminRolesPage) },
      { path: 'surveys', lazy: lazy(() => import('@/pages/festival-admin/AdminSurveysPage'), (m) => m.AdminSurveysPage) },
      { path: 'regulations', lazy: lazy(() => import('@/pages/festival-admin/AdminRegulationsPage'), (m) => m.AdminRegulationsPage) },
      { path: 'meetings/:meetingId', lazy: lazy(() => import('@/pages/festival-admin/AdminMeetingEditorPage'), (m) => m.AdminMeetingEditorPage) },
      { path: 'workspace', lazy: lazy(() => import('@/pages/festival-admin/AdminWorkspacePage'), (m) => m.AdminWorkspacePage) },
      { path: 'workspace/docs/:docId', lazy: lazy(() => import('@/pages/festival-admin/WorkspaceDocEditorPage'), (m) => m.WorkspaceDocEditorPage) },
      { path: 'workspace/sheets/:sheetId', lazy: lazy(() => import('@/pages/festival-admin/WorkspaceSheetPage'), (m) => m.WorkspaceSheetPage) },
      { path: 'workspace/calendar', lazy: lazy(() => import('@/pages/festival-admin/WorkspaceCalendarPage'), (m) => m.WorkspaceCalendarPage) },
      { path: 'workspace/tasks/:boardId', lazy: lazy(() => import('@/pages/festival-admin/WorkspaceKanbanPage'), (m) => m.WorkspaceKanbanPage) },
      { path: 'settings', lazy: lazy(() => import('@/pages/festival-admin/AdminSettingsPage'), (m) => m.AdminSettingsPage) },
      { path: 'settings/theme', lazy: lazy(() => import('@/pages/festival-admin/AdminSettingsPage'), (m) => m.AdminSettingsPage) },
      { path: 'settings/communication', lazy: lazy(() => import('@/pages/festival-admin/AdminSettingsPage'), (m) => m.AdminSettingsPage) },
    ],
  },

  // ─── Platform admin routes ─────────────────────────────────────────────
  {
    path: '/admin',
    element: <PlatformAdminLayout />,
    children: [
      { index: true, lazy: lazy(() => import('@/pages/admin/PlatformAdminDashboard'), (m) => m.PlatformAdminDashboard) },
      { path: 'users', lazy: lazy(() => import('@/pages/admin/PlatformAdminUsers'), (m) => m.PlatformAdminUsers) },
      { path: 'festivals', lazy: lazy(() => import('@/pages/admin/PlatformAdminFestivals'), (m) => m.PlatformAdminFestivals) },
      { path: 'tickets', lazy: lazy(() => import('@/pages/admin/PlatformAdminTickets'), (m) => m.PlatformAdminTickets) },
      { path: 'billing', lazy: lazy(() => import('@/pages/admin/PlatformAdminBilling'), (m) => m.PlatformAdminBilling) },
    ],
  },

  // ─── Misc ──────────────────────────────────────────────────────────────
  { path: '/join/:token', lazy: lazy(() => import('@/pages/platform/JoinInvitePage'), (m) => m.JoinInvitePage) },
  { path: '*', element: <NotFoundPage /> },
]);
