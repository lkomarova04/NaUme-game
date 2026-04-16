import { RouterProvider as ReactRouterProvider } from 'react-router-dom';

import { MockGameProvider } from '@/app/providers/MockGameProvider';
import { router } from '@/app/router';

export const RouterProvider = () => {
  return (
    <MockGameProvider>
      <ReactRouterProvider router={router} />
    </MockGameProvider>
  );
};
