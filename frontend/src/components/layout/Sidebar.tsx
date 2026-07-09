import React from 'react';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from '@/components/ui/sidebar';
import {
  LayoutDashboard, MessageSquare, Search, BarChart3, MapPin,
  Share2, FileText, History, LogOut, Users, Shield,
  DollarSign, Bell, BookOpen, UserCheck
} from 'lucide-react';
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
  { title: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['admin', 'supervisor', 'investigator', 'analyst', 'constable', 'policymaker'] },
  { title: 'AI Assistant', icon: MessageSquare, path: '/ai-assistant', roles: ['admin', 'supervisor', 'investigator', 'analyst', 'constable'] },
  { title: 'Crime Search', icon: Search, path: '/search', roles: ['admin', 'supervisor', 'investigator', 'analyst', 'constable'] },
  { title: 'Assigned Cases', icon: FileText, path: '/cases', roles: ['admin', 'supervisor', 'investigator', 'constable'] },
  { title: 'Criminal Network', icon: Share2, path: '/network', roles: ['admin', 'supervisor', 'investigator', 'analyst'] },
  { title: 'Crime Hotspots', icon: MapPin, path: '/hotspots', roles: ['admin', 'supervisor', 'investigator', 'analyst'] },
  { title: 'Crime Analytics', icon: BarChart3, path: '/analytics', roles: ['admin', 'supervisor', 'investigator', 'analyst', 'policymaker'] },
  { title: 'Offender Profiling', icon: UserCheck, path: '/offenders', roles: ['admin', 'supervisor', 'investigator'] },
  { title: 'Decision Support', icon: Shield, path: '/decision-support', roles: ['admin', 'supervisor', 'investigator'] },
  { title: 'Financial Crime', icon: DollarSign, path: '/financial', roles: ['admin', 'supervisor', 'investigator'] },
  { title: 'Forecasting', icon: Bell, path: '/alerts', roles: ['admin', 'supervisor', 'investigator', 'analyst'] },
  { title: 'Sociological', icon: BookOpen, path: '/sociological', roles: ['admin', 'supervisor', 'analyst', 'policymaker'] },
  { title: 'Audit Logs', icon: History, path: '/logs', roles: ['admin', 'supervisor'] },
];


const AppSidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const filteredNavItems = navItems.filter(item =>
    user && item.roles.includes(user.role as UserRole)
  );

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
            <Shield className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm leading-none">PRAHARI</span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Crime Intelligence OS</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="p-2 gap-0.5">
          {filteredNavItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton
                isActive={location.pathname === item.path}
                tooltip={item.title}
              >
                <Link to={item.path} className="flex items-center gap-2 w-full">
                  <item.icon className="w-4 h-4" />
                  <span className="text-xs">{item.title}</span>
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
              <span className="text-destructive text-xs">Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
