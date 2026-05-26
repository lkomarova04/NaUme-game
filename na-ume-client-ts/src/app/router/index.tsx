import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AppLayout } from '@/app/providers/AppLayout';
import AdminPage from '@/pages/admin';
import DisplayPage from '@/pages/display/DisplayPage';
import PlayerPage from '@/pages/player';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: '/',
        element: <Navigate to="/admin" replace />,
      },
      {
        path: '/display/:sessionId',
        element: <DisplayPage />,
      },
      {
        path: '/player/:sessionId',
        element: <PlayerPage />,
      },
      {
        path: '/player',
        element: <PlayerPage />,
      },
      {
        path: '/admin',
        element: <AdminPage />,
      },
      {
        path: '/admin/:sessionId',
        element: <AdminPage />,
      },
    ],
  },
]);
