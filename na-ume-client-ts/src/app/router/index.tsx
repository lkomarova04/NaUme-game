import { createBrowserRouter, Navigate } from 'react-router-dom';

import DisplayPage from "@/pages/display/DisplayPage"
import PlayerPage from '@/pages/player';
import AdminPage from '@/pages/admin';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/display/test" replace />,
  },

  {
    path: '/display/:sessionId',
    element: <DisplayPage />,
  },
  {
    path: '/player',
    element: <PlayerPage />,
  },
  {
    path: '/admin',
    element: <AdminPage />,
  },

]);