import { Link, useLocation, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
  Building2,
  BarChart3,
  Bell,
  Settings,
  ChevronDown,
  Package,
  Code,
  DollarSign,
  Megaphone,
  HeartHandshake,
  Calculator,
  Settings as SettingsIcon,
  Users,
  LogOut,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { trpc } from "@/utils/trpc";
import { useCompany } from "@/lib/company-context";
import { authClient } from "@/lib/auth-client";
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";

const deptIcons: Record<string, LucideIcon> = {
  product: Package,
  engineering: Code,
  sales: DollarSign,
  marketing: Megaphone,
  customer_success: HeartHandshake,
  finance: Calculator,
  operations: SettingsIcon,
  hr: Users,
};

const deptLabels: Record<string, string> = {
  product: "Product AI",
  engineering: "Engineering AI",
  sales: "Sales AI",
  marketing: "Marketing AI",
  customer_success: "Customer Success AI",
  finance: "Finance AI",
  operations: "Operations AI",
  hr: "HR AI",
};

interface AppSidebarProps {
  onSelectAgent?: (departmentType: string | undefined) => void;
  activeAgent?: string | undefined;
}

export function AppSidebar({ onSelectAgent, activeAgent }: AppSidebarProps) {
  const { company } = useCompany();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [agentsOpen, setAgentsOpen] = useState(true);

  const { data: departments = [] } = useQuery({
    ...trpc.department.list.queryOptions({ companyId: company?.id || "" }),
    enabled: !!company?.id,
  });

  const { data: alertCounts } = useQuery({
    ...trpc.alerts.getCounts.queryOptions({ companyId: company?.id || "" }),
    enabled: !!company?.id,
  });

  const enabledDepts = departments.filter((d) => d.isEnabled && d.aiEnabled);

  const basePath = company ? "/dashboard/" + company.id : "/dashboard";

  const navItems = [
    { to: basePath, icon: Home, label: "Home", exact: true },
    { to: basePath + "/departments", icon: Building2, label: "Departments" },
    { to: basePath + "/metrics", icon: BarChart3, label: "Metrics" },
    {
      to: basePath + "/alerts",
      icon: Bell,
      label: "Alerts",
      badge: alertCounts?.activeCount,
    },
    { to: basePath + "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="w-[220px] flex flex-col h-full px-3 py-4">
      <div className="flex items-center gap-2.5 px-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-primary">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="font-semibold text-[15px] tracking-tight">Orchestrator</span>
      </div>

      <nav className="flex flex-col gap-0.5">
        {navItems.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] font-medium transition-colors relative",
                isActive
                  ? "text-foreground bg-foreground/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/3"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-primary rounded-r-full" />
              )}
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="ml-auto min-w-[20px] h-5 flex items-center justify-center text-[11px] font-semibold bg-primary text-primary-foreground rounded-full px-1.5">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6">
        <button
          onClick={() => setAgentsOpen(!agentsOpen)}
          className="flex items-center justify-between w-full px-2.5 py-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          AI Agents
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              !agentsOpen && "-rotate-90"
            )}
          />
        </button>

        {agentsOpen && (
          <div className="flex flex-col gap-0.5 mt-1">
            {enabledDepts.map((dept) => {
              const Icon = deptIcons[dept.type] || Package;
              const isActive = activeAgent === dept.type;
              return (
                <div
                  key={dept.type}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors w-full group",
                    isActive
                      ? "text-foreground bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/3"
                  )}
                >
                  <button
                    onClick={() => {
                      if (onSelectAgent) {
                        onSelectAgent(dept.type);
                      }
                      if (location.pathname !== basePath) {
                        navigate(basePath);
                      }
                    }}
                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{deptLabels[dept.type] || dept.name}</span>
                  </button>
                  <Link
                    to={`${basePath}/departments/${dept.type}`}
                    className="shrink-0 p-1 rounded text-muted-foreground/50 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    title="View context"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 space-y-2">
        <ModeToggle variant="sidebar" />
        {session && (
          <div className="rounded-xl bg-foreground/4 p-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                {session.user.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{session.user.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {session.user.email}
                </p>
              </div>
              <button
                onClick={() => {
                  authClient.signOut({
                    fetchOptions: {
                      onSuccess: () => navigate("/"),
                    },
                  });
                }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
