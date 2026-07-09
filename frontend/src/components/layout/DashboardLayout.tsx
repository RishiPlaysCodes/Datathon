import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from './Sidebar';
import TopNav from './TopNav';
import { Outlet } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';

const DashboardLayout = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <TopNav />
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
        <Toaster position="top-right" />
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
