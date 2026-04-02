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

// Invite join page
import { JoinInvitePage } from '@/pages/platform/JoinInvitePage';

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
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/docs', element: <DocsPage /> },
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
      { path: 'settings', element: <AdminSettingsPage /> },
      { path: 'settings/theme', element: <AdminSettingsPage /> },
      { path: 'settings/communication', element: <AdminSettingsPage /> },
    ],
  },

  // Invite join
  { path: '/join/:token', element: <JoinInvitePage /> },

  // 404
  { path: '*', element: <NotFoundPage /> },
]);
