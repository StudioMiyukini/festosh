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
import { ProfilePage } from '@/pages/platform/ProfilePage';

// Festival public pages
import { FestivalHomePage } from '@/pages/festival/FestivalHomePage';
import { FestivalSchedulePage } from '@/pages/festival/FestivalSchedulePage';
import { FestivalMapPage } from '@/pages/festival/FestivalMapPage';
import { FestivalExhibitorsPage } from '@/pages/festival/FestivalExhibitorsPage';
import { FestivalApplyPage } from '@/pages/festival/FestivalApplyPage';

// Festival admin pages
import { AdminOverviewPage } from '@/pages/festival-admin/AdminOverviewPage';
import { AdminCmsPage } from '@/pages/festival-admin/AdminCmsPage';
import { AdminProgrammingPage } from '@/pages/festival-admin/AdminProgrammingPage';
import { AdminExhibitorsPage } from '@/pages/festival-admin/AdminExhibitorsPage';
import { AdminVolunteersPage } from '@/pages/festival-admin/AdminVolunteersPage';
import { AdminBudgetPage } from '@/pages/festival-admin/AdminBudgetPage';
import { AdminEquipmentPage } from '@/pages/festival-admin/AdminEquipmentPage';
import { AdminSettingsPage } from '@/pages/festival-admin/AdminSettingsPage';

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
    ],
  },

  // Festival admin routes
  {
    path: '/f/:slug/admin',
    element: <FestivalAdminLayout />,
    children: [
      { index: true, element: <AdminOverviewPage /> },
      { path: 'cms', element: <AdminCmsPage /> },
      { path: 'programming', element: <AdminProgrammingPage /> },
      { path: 'exhibitors', element: <AdminExhibitorsPage /> },
      { path: 'volunteers', element: <AdminVolunteersPage /> },
      { path: 'budget', element: <AdminBudgetPage /> },
      { path: 'equipment', element: <AdminEquipmentPage /> },
      { path: 'settings', element: <AdminSettingsPage /> },
    ],
  },

  // 404
  { path: '*', element: <NotFoundPage /> },
]);
