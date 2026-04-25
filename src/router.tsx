import { createBrowserRouter } from 'react-router-dom';

// Layouts
import { PlatformLayout } from '@/layouts/PlatformLayout';
import { FestivalPublicLayout } from '@/layouts/FestivalPublicLayout';
import { FestivalAdminLayout } from '@/layouts/FestivalAdminLayout';
import { AuthLayout } from '@/layouts/AuthLayout';

// Platform pages
import { HomePage } from '@/pages/platform/HomePage';
import { DirectoryPage } from '@/pages/platform/DirectoryPage';
import { DashboardPage } from '@/pages/platform/DashboardPage';
import { LoginPage } from '@/pages/platform/LoginPage';
import { SignupPage } from '@/pages/platform/SignupPage';
import { ForgotPasswordPage } from '@/pages/platform/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/platform/ResetPasswordPage';
import { ProfilePage } from '@/pages/platform/ProfilePage';
import { PrivacyPage } from '@/pages/platform/PrivacyPage';
import { AboutPage } from '@/pages/platform/AboutPage';
import { DocsPage } from '@/pages/platform/DocsPage';
import { DocsVisitorPage } from '@/pages/platform/docs/DocsVisitorPage';
import { DocsVolunteerPage } from '@/pages/platform/docs/DocsVolunteerPage';
import { DocsExhibitorPage } from '@/pages/platform/docs/DocsExhibitorPage';
import { DocsOrganizerPage } from '@/pages/platform/docs/DocsOrganizerPage';

// Festival public pages
import { FestivalHomePage } from '@/pages/festival/FestivalHomePage';
import { FestivalSchedulePage } from '@/pages/festival/FestivalSchedulePage';
import { FestivalMapPage } from '@/pages/festival/FestivalMapPage';
import { FestivalExhibitorsPage } from '@/pages/festival/FestivalExhibitorsPage';
import { FestivalApplyPage } from '@/pages/festival/FestivalApplyPage';
import { CmsPublicPage } from '@/pages/festival/CmsPublicPage';

// Festival admin pages
import { AdminOverviewPage } from '@/pages/festival-admin/AdminOverviewPage';
import { AdminCmsPage } from '@/pages/festival-admin/AdminCmsPage';
import { AdminCmsEditorPage } from '@/pages/festival-admin/AdminCmsEditorPage';
import { AdminProgrammingPage } from '@/pages/festival-admin/AdminProgrammingPage';
import { AdminExhibitorsPage } from '@/pages/festival-admin/AdminExhibitorsPage';
import { AdminVolunteersPage } from '@/pages/festival-admin/AdminVolunteersPage';
import { AdminBudgetPage } from '@/pages/festival-admin/AdminBudgetPage';
import { AdminEquipmentPage } from '@/pages/festival-admin/AdminEquipmentPage';
import { AdminFloorPlanEditorPage } from '@/pages/festival-admin/AdminFloorPlanEditorPage';
import { AdminSettingsPage } from '@/pages/festival-admin/AdminSettingsPage';
import { AdminAgendaPage } from '@/pages/festival-admin/AdminAgendaPage';
import { AdminTasksMeetingsPage } from '@/pages/festival-admin/AdminTasksMeetingsPage';
import { AdminTicketsPage } from '@/pages/festival-admin/AdminTicketsPage';
import { AdminTicketingPage } from '@/pages/festival-admin/AdminTicketingPage';
import { AdminMarketplacePage } from '@/pages/festival-admin/AdminMarketplacePage';
import { AdminSponsorsPage } from '@/pages/festival-admin/AdminSponsorsPage';
import { AdminReservationsPage } from '@/pages/festival-admin/AdminReservationsPage';
import { AdminGamificationPage } from '@/pages/festival-admin/AdminGamificationPage';
import { AdminVotesPage } from '@/pages/festival-admin/AdminVotesPage';
import { AdminRafflesPage } from '@/pages/festival-admin/AdminRafflesPage';
import { AdminArtistsPage } from '@/pages/festival-admin/AdminArtistsPage';
import { AdminQueuesPage } from '@/pages/festival-admin/AdminQueuesPage';
import { AdminAnalyticsPage } from '@/pages/festival-admin/AdminAnalyticsPage';
import { AdminApiPage } from '@/pages/festival-admin/AdminApiPage';
import { AdminQrObjectsPage } from '@/pages/festival-admin/AdminQrObjectsPage';
import { AdminRolesPage } from '@/pages/festival-admin/AdminRolesPage';
import { AdminSurveysPage } from '@/pages/festival-admin/AdminSurveysPage';
import { AdminRegulationsPage } from '@/pages/festival-admin/AdminRegulationsPage';
import { SurveyFillPage } from '@/pages/festival/SurveyFillPage';
import { FestivalRegulationsPage } from '@/pages/festival/FestivalRegulationsPage';
import { AdminMeetingEditorPage } from '@/pages/festival-admin/AdminMeetingEditorPage';
import { AdminWorkspacePage } from '@/pages/festival-admin/AdminWorkspacePage';
import { WorkspaceDocEditorPage } from '@/pages/festival-admin/WorkspaceDocEditorPage';
import { WorkspaceSheetPage } from '@/pages/festival-admin/WorkspaceSheetPage';
import { WorkspaceCalendarPage } from '@/pages/festival-admin/WorkspaceCalendarPage';
import { WorkspaceKanbanPage } from '@/pages/festival-admin/WorkspaceKanbanPage';

// New platform pages
import { MessagingPage } from '@/pages/platform/MessagingPage';
import { ExhibitorDashboardPage } from '@/pages/platform/ExhibitorDashboardPage';
import { ExhibitorDirectoryPage } from '@/pages/platform/ExhibitorDirectoryPage';
import { PosTerminalPage } from '@/pages/platform/PosTerminalPage';
import { PosProductsPage } from '@/pages/platform/PosProductsPage';
import { PosAccountingPage } from '@/pages/platform/PosAccountingPage';
import { VisitorDashboardPage } from '@/pages/platform/VisitorDashboardPage';
import { QrScannerPage } from '@/pages/platform/QrScannerPage';
import { PricingPage } from '@/pages/platform/PricingPage';
import { SubscriptionPage } from '@/pages/platform/SubscriptionPage';
import { BillingPage } from '@/pages/platform/BillingPage';
import { VolunteerDashboardPage } from '@/pages/platform/VolunteerDashboardPage';
import { OrganizerDashboardPage } from '@/pages/platform/OrganizerDashboardPage';

// Invite join page
import { JoinInvitePage } from '@/pages/platform/JoinInvitePage';

// Platform admin pages
import { PlatformAdminLayout } from '@/layouts/PlatformAdminLayout';
import { PlatformAdminDashboard } from '@/pages/admin/PlatformAdminDashboard';
import { PlatformAdminUsers } from '@/pages/admin/PlatformAdminUsers';
import { PlatformAdminFestivals } from '@/pages/admin/PlatformAdminFestivals';
import { PlatformAdminTickets } from '@/pages/admin/PlatformAdminTickets';
import { PlatformAdminBilling } from '@/pages/admin/PlatformAdminBilling';

// Not Found
import { NotFoundPage } from '@/pages/platform/NotFoundPage';

/**
 * Single unified router.
 * Platform pages live at root paths.
 * Festival pages live under /f/:slug/...
 */
export const router = createBrowserRouter([
  // Auth routes
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password/:token', element: <ResetPasswordPage /> },
    ],
  },

  // Main platform routes
  {
    element: <PlatformLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/directory', element: <DirectoryPage /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/messaging', element: <MessagingPage /> },
      { path: '/exhibitor', element: <ExhibitorDashboardPage /> },
      { path: '/exhibitors', element: <ExhibitorDirectoryPage /> },
      { path: '/pos', element: <PosTerminalPage /> },
      { path: '/pos/products', element: <PosProductsPage /> },
      { path: '/pos/accounting', element: <PosAccountingPage /> },
      { path: '/visitor', element: <VisitorDashboardPage /> },
      { path: '/scan', element: <QrScannerPage /> },
      { path: '/pricing', element: <PricingPage /> },
      { path: '/subscription', element: <SubscriptionPage /> },
      { path: '/billing', element: <BillingPage /> },
      { path: '/volunteer', element: <VolunteerDashboardPage /> },
      { path: '/organizer', element: <OrganizerDashboardPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/docs', element: <DocsPage /> },
      { path: '/docs/visitor', element: <DocsVisitorPage /> },
      { path: '/docs/volunteer', element: <DocsVolunteerPage /> },
      { path: '/docs/exhibitor', element: <DocsExhibitorPage /> },
      { path: '/docs/organizer', element: <DocsOrganizerPage /> },
    ],
  },

  // Festival public routes
  {
    path: '/f/:slug',
    element: <FestivalPublicLayout />,
    children: [
      { index: true, element: <FestivalHomePage /> },
      { path: 'schedule', element: <FestivalSchedulePage /> },
      { path: 'map', element: <FestivalMapPage /> },
      { path: 'exhibitors', element: <FestivalExhibitorsPage /> },
      { path: 'apply', element: <FestivalApplyPage /> },
      // CMS pages catch-all (must be last)
      { path: 'p/:pageSlug', element: <CmsPublicPage /> },
      { path: 'survey/:surveyId', element: <SurveyFillPage /> },
      { path: 'regulations', element: <FestivalRegulationsPage /> },
    ],
  },

  // Festival admin routes
  {
    path: '/f/:slug/admin',
    element: <FestivalAdminLayout />,
    children: [
      { index: true, element: <AdminOverviewPage /> },
      { path: 'cms', element: <AdminCmsPage /> },
      { path: 'cms/pages/:pageId', element: <AdminCmsEditorPage /> },
      { path: 'programming', element: <AdminProgrammingPage /> },
      { path: 'exhibitors', element: <AdminExhibitorsPage /> },
      { path: 'volunteers', element: <AdminVolunteersPage /> },
      { path: 'budget', element: <AdminBudgetPage /> },
      { path: 'equipment', element: <AdminEquipmentPage /> },
      { path: 'agenda', element: <AdminAgendaPage /> },
      { path: 'tasks', element: <AdminTasksMeetingsPage /> },
      { path: 'floor-plan', element: <AdminFloorPlanEditorPage /> },
      { path: 'tickets', element: <AdminTicketsPage /> },
      { path: 'ticketing', element: <AdminTicketingPage /> },
      { path: 'marketplace', element: <AdminMarketplacePage /> },
      { path: 'sponsors', element: <AdminSponsorsPage /> },
      { path: 'reservations', element: <AdminReservationsPage /> },
      { path: 'gamification', element: <AdminGamificationPage /> },
      { path: 'votes', element: <AdminVotesPage /> },
      { path: 'raffles', element: <AdminRafflesPage /> },
      { path: 'artists', element: <AdminArtistsPage /> },
      { path: 'queues', element: <AdminQueuesPage /> },
      { path: 'analytics', element: <AdminAnalyticsPage /> },
      { path: 'api', element: <AdminApiPage /> },
      { path: 'qr-objects', element: <AdminQrObjectsPage /> },
      { path: 'roles', element: <AdminRolesPage /> },
      { path: 'surveys', element: <AdminSurveysPage /> },
      { path: 'regulations', element: <AdminRegulationsPage /> },
      { path: 'meetings/:meetingId', element: <AdminMeetingEditorPage /> },
      { path: 'workspace', element: <AdminWorkspacePage /> },
      { path: 'workspace/docs/:docId', element: <WorkspaceDocEditorPage /> },
      { path: 'workspace/sheets/:sheetId', element: <WorkspaceSheetPage /> },
      { path: 'workspace/calendar', element: <WorkspaceCalendarPage /> },
      { path: 'workspace/tasks/:boardId', element: <WorkspaceKanbanPage /> },
      { path: 'settings', element: <AdminSettingsPage /> },
      { path: 'settings/theme', element: <AdminSettingsPage /> },
      { path: 'settings/communication', element: <AdminSettingsPage /> },
    ],
  },

  // Platform admin routes
  {
    path: '/admin',
    element: <PlatformAdminLayout />,
    children: [
      { index: true, element: <PlatformAdminDashboard /> },
      { path: 'users', element: <PlatformAdminUsers /> },
      { path: 'festivals', element: <PlatformAdminFestivals /> },
      { path: 'tickets', element: <PlatformAdminTickets /> },
      { path: 'billing', element: <PlatformAdminBilling /> },
    ],
  },

  // Invite join
  { path: '/join/:token', element: <JoinInvitePage /> },

  // 404
  { path: '*', element: <NotFoundPage /> },
]);
