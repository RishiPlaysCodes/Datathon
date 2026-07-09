import React from 'react';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from '@/components/ui/sidebar';
import { LayoutDashboard, MessageSquare, Search, BarChart3, MapPin, Share2, FileText, History, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types/auth';
import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  title: string;
  icon: React.ElementType;
  path: string;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { title: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['admin', 'investigator', 'officer'] },
  { title: 'AI Assistant', icon: MessageSquare, path: '/ai-assistant', roles: ['admin', 'investigator', 'officer'] },
  { title: 'Crime Search', icon: Search, path: '/search', roles: ['admin', 'investigator', 'officer'] },
  { title: 'Assigned Cases', icon: History, path: '/cases', roles: ['admin', 'investigator', 'officer'] },
  { title: 'Crime Analytics', icon: BarChart3, path: '/analytics', roles: ['admin', 'investigator'] },
  { title: 'Crime Hotspots', icon: MapPin, path: '/hotspots', roles: ['admin', 'investigator'] },
  { title: 'Criminal Network', icon: Share2, path: '/network', roles: ['admin', 'investigator'] },
  { title: 'Reports', icon: FileText, path: '/reports', roles: ['admin', 'investigator'] },
  { title: 'Audit Logs', icon: History, path: '/logs', roles: ['admin'] },
  { title: 'Settings', icon: Settings, path: '/settings', roles: ['admin', 'investigator', 'officer'] },
];

const AppSidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const filteredNavItems = navItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
            <img src="https://upload.wikimedia.org/wikipedia/commons/1/13/Seal_of_Karnataka.svg" alt="KSP" className="w-6 h-6 invert" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm leading-none">KSP AI</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Investigation</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="p-2 gap-1">
          {filteredNavItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton 
                isActive={location.pathname === item.path}
                tooltip={item.title}
              >
                <Link to={item.path}>
                  <item.icon className="w-4 h-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout}>
              <LogOut className="w-4 h-4 text-destructive" />
              <span className="text-destructive">Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
