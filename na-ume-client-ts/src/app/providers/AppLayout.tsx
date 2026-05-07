import { Outlet } from 'react-router-dom';
import { SocketGameProvider } from './SocketGameProvider';

export const AppLayout = () => {
  return (
    <SocketGameProvider>
      <Outlet />
    </SocketGameProvider>
  );
};
