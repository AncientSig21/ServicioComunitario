// router/index.tsx
import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from '../layouts/RootLayout';
import { HomePage, BookPages, TesisPages } from '../pages';

import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import AdminLayout from '../pages/AdminDashboard';
import AdminStatsPage from '../pages/AdminStatsPage';
import AdminResidentesPage from '../pages/AdminResidentesPage';
import AdminReportsPage from '../pages/AdminReportsPage';

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
        path: 'libros',
        element: <BookPages />, // sin prop books
      },
      {
        path: 'tesis',
        element: <TesisPages />, // sin prop books
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
        path: 'admin',
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <AdminStatsPage />,
          },
          {
            path: 'libros',
            element: <AdminResidentesPage />,
          },
          {
            path: 'reportes',
            element: <AdminReportsPage />,
          },
        ],
      },
      {
        path: 'estudiantes',
        element: <HomePage />,
      },
    ],
  },
]);
