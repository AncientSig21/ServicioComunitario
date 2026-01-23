// router/index.tsx
import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from '../layouts/RootLayout';
import { HomePage, TesisPages, AnunciosPage, MantenimientoPage, ReservasPage, PagosPage, ProfilePage } from '../pages';

import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import AdminLayout from '../pages/AdminDashboard';
import AdminStatsPage from '../pages/AdminStatsPage';
import AdminResidentesPage from '../pages/AdminResidentesPage';
import AdminReportsPage from '../pages/AdminReportsPage';
import AdminAprobacionesPage from '../pages/AdminAprobacionesPage';
import AdminCondominiosPage from '../pages/AdminCondominiosPage';
import AdminMantenimientoPage from '../pages/AdminMantenimientoPage';
import AdminPagosPage from '../pages/AdminPagosPage';
import AdminValidacionPagosPage from '../pages/AdminValidacionPagosPage';
import { AdminGestionEventosEspaciosPage } from '../pages/AdminGestionEventosEspaciosPage';
import { ProtectedRoute } from '../components/shared/ProtectedRoute';
import { AdminProtectedRoute } from '../components/shared/AdminProtectedRoute';
import { BookPages } from '../pages/BookPages';
import { TestRLSPage } from '../pages/TestRLSPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'tesis',
        element: (
          <ProtectedRoute>
            <TesisPages />
          </ProtectedRoute>
        ),
      },
      {
        path: 'anuncios',
        element: (
          <ProtectedRoute>
            <AnunciosPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'libros',
        element: (
          <ProtectedRoute>
            <BookPages />
          </ProtectedRoute>
        ),
      },
      {
        path: 'mantenimiento',
        element: (
          <ProtectedRoute>
            <MantenimientoPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reservas',
        element: (
          <ProtectedRoute>
            <ReservasPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'pagos',
        element: (
          <ProtectedRoute>
            <PagosPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
      {
        path: 'forgot-password',
        element: <ForgotPasswordPage />,
      },
      {
        path: 'perfil',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'test-rls',
        element: (
          <ProtectedRoute>
            <TestRLSPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <AdminStatsPage />,
          },
          {
            path: 'residentes',
            element: <AdminResidentesPage />,
          },
          {
            path: 'reportes',
            element: <AdminReportsPage />,
          },
          {
            path: 'aprobaciones',
            element: <AdminAprobacionesPage />,
          },
          {
            path: 'condominios',
            element: <AdminCondominiosPage />,
          },
          {
            path: 'mantenimiento',
            element: <AdminMantenimientoPage />,
          },
          {
            path: 'pagos',
            element: <AdminPagosPage />,
          },
          {
            path: 'validacion-pagos',
            element: <AdminValidacionPagosPage />,
          },
          {
            path: 'gestion-eventos-espacios',
            element: <AdminGestionEventosEspaciosPage />,
          },
        ],
      },
      {
        path: 'estudiantes',
        element: (
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
