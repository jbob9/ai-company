import { useEffect } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Building2, BarChart3, Bell, MessageSquare, Settings } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { CompanyProvider, useCompany } from "@/lib/company-context";
import { CompanySelector } from "@/components/dashboard/company-selector";
import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { cn } from "@/lib/utils";

function DashboardSidebar() {
  const { company } = useCompany();
  const location = useLocation();

  const { data: alertCounts } = useQuery({
    ...trpc.alerts.getCounts.queryOptions({ companyId: company?.id || "" }),
    enabled: !!company?.id,
  });

  if (!company) return null;

  const navItems = [
    { to: "/dashboard/" + company.id, icon: LayoutDashboard, label: "Overview", exact: true },
    { to: "/dashboard/" + company.id + "/departments", icon: Building2, label: "Departments" },
    { to: "/dashboard/" + company.id + "/metrics", icon: BarChart3, label: "Metrics" },
    { to: "/dashboard/" + company.id + "/alerts", icon: Bell, label: "Alerts", badge: alertCounts?.activeCount },
    { to: "/dashboard/" + company.id + "/ai", icon: MessageSquare, label: "AI Chat" },
    { to: "/dashboard/" + company.id + "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="w-64 border-r bg-muted/30 p-4 flex flex-col gap-2">
      <div className="mb-4">
        <CompanySelector />
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          return (
            <Button
              key={item.to}
              variant={isActive ? "secondary" : "ghost"}
              className={cn("justify-start", isActive && "bg-secondary")}
              asChild
            >
              <Link to={item.to}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            </Button>
          );
        })}
      </nav>
    </div>
  );
}

function DashboardContent() {
  const { company, isLoading } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && company && location.pathname === "/dashboard") {
      navigate("/dashboard/" + company.id, { replace: true });
    }
  }, [company, isLoading, location.pathname, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <h2 className="text-xl font-semibold">Welcome to AI Company Orchestrator</h2>
        <p className="text-muted-foreground">Create your first company to get started</p>
        <Button asChild>
          <Link to="/dashboard/new-company">Create Company</Link>
        </Button>
      </div>
    );
  }

  return <Outlet />;
}

export default function Dashboard() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session && !isPending) {
      navigate("/login");
    }
  }, [session, isPending, navigate]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <CompanyProvider>
      <div className="flex h-full">
        <DashboardSidebar />
        <main className="flex-1 overflow-auto p-6">
          <DashboardContent />
        </main>
      </div>
    </CompanyProvider>
  );
}
