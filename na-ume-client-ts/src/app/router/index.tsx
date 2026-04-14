import { createBrowserRouter, Navigate } from 'react-router-dom';

import DisplayPage from "@/pages/display/DisplayPage"

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/display/test" replace />,
  },

  {
    path: '/display/:sessionId',
    element: <DisplayPage />,
  },

]);