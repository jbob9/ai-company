import { useEffect, useState } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router";
import {
  PanelLeftClose,
  PanelRightClose,
  PanelLeft,
  MessageSquare,
  Menu,
  X,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { CompanyProvider, useCompany } from "@/lib/company-context";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { ConversationPanel } from "@/components/dashboard/conversation-panel";
import { AIHome } from "@/components/dashboard/ai-home";
import { Button } from "@/components/ui/button";

const SIDEBAR_OPEN_KEY = "dashboard-sidebar-open";
const CHAT_PANEL_OPEN_KEY = "dashboard-chat-panel-open";

function readStorage(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v !== null ? v === "true" : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: boolean) {
  try {
    localStorage.setItem(key, String(value));
  } catch {}
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const handler = () => setIsMobile(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

function DashboardInner() {
  const { company, companies, isLoading, selectCompany } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [activeAgent, setActiveAgent] = useState<string | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
      ? false
      : readStorage(SIDEBAR_OPEN_KEY, true)
  );
  const [chatPanelOpen, setChatPanelOpen] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
      ? false
      : readStorage(CHAT_PANEL_OPEN_KEY, true)
  );

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      if (!isMobile) writeStorage(SIDEBAR_OPEN_KEY, next);
      return next;
    });
  };

  const toggleChatPanel = () => {
    setChatPanelOpen((prev) => {
      const next = !prev;
      if (!isMobile) writeStorage(CHAT_PANEL_OPEN_KEY, next);
      return next;
    });
  };

  // Close overlay panels on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
      setChatPanelOpen(false);
    }
  }, [isMobile, location.pathname]);

  const basePath = company ? "/dashboard/" + company.id : "/dashboard";
  const isNewCompanyPage = location.pathname === "/dashboard/new-company";
  const isHomePath =
    location.pathname === "/dashboard" ||
    location.pathname === basePath ||
    location.pathname === basePath + "/";
  const isSubPage =
    !isHomePath && (location.pathname.startsWith(basePath) || isNewCompanyPage);
  const chatMatch = location.pathname.match(/^\/dashboard\/([^/]+)\/chat\/([^/]+)$/);
  const activeChatId = chatMatch ? chatMatch[2] : undefined;

  // Redirect /dashboard to selected company's dashboard
  useEffect(() => {
    if (!isLoading && company && location.pathname === "/dashboard") {
      navigate("/dashboard/" + company.id, { replace: true });
    }
  }, [company, isLoading, location.pathname, navigate]);

  // Sync context from URL and redirect if company not in user's list
  useEffect(() => {
    if (isLoading || companies.length === 0) return;
    const match = location.pathname.match(/^\/dashboard\/([^/]+)/);
    const urlCompanyId = match && match[1] !== "new-company" ? match[1] : null;
    if (!urlCompanyId) return;
    const isMember = companies.some((c) => c.id === urlCompanyId);
    if (!isMember) {
      navigate("/dashboard", { replace: true });
      return;
    }
    if (company?.id !== urlCompanyId) {
      selectCompany(urlCompanyId);
    }
  }, [location.pathname, companies, isLoading, company?.id, selectCompany, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  // When user has no company, show empty state unless they're on the create-company page
  if (!company && !isNewCompanyPage) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
        <h2 className="text-xl font-semibold">Welcome to AI Company Orchestrator</h2>
        <p className="text-muted-foreground text-sm">
          Create your first company to get started
        </p>
        <Link to="/dashboard/new-company">
          <Button>Create Company</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col md:flex-row">
      {/* Mobile top bar */}
      <header className="flex md:hidden h-14 shrink-0 items-center justify-between gap-2 px-4 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-semibold text-sm truncate">Orchestrator</span>
        <button
          type="button"
          onClick={() => setChatPanelOpen(true)}
          className="p-2 -mr-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5"
          aria-label="Open chat history"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      </header>

      {/* Left: sidebar (overlay on mobile, inline on desktop) or expand button */}
      {sidebarOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={toggleSidebar}
            aria-hidden
          />
          <div className="fixed md:relative inset-y-0 left-0 z-50 md:z-auto w-[280px] max-w-[85vw] md:max-w-none md:w-auto md:m-2 md:mr-0 shrink-0 flex flex-col">
            <div className="glass-panel h-full flex flex-col md:flex-row rounded-r-2xl md:rounded-2xl overflow-hidden">
              <div className="flex md:hidden items-center justify-between px-4 py-3 border-b border-sidebar-border shrink-0">
                <span className="font-semibold text-sm">Menu</span>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                <AppSidebar
                  onSelectAgent={(dept) => {
                    setActiveAgent(dept);
                    if (location.pathname !== basePath) navigate(basePath);
                  }}
                  activeAgent={activeAgent}
                />
              </div>
              <button
                type="button"
                onClick={toggleSidebar}
                className="hidden md:flex shrink-0 w-8 items-center justify-center border-l border-sidebar-border text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                title="Close sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="hidden md:flex m-2 mr-0 shrink-0">
          <button
            type="button"
            onClick={toggleSidebar}
            className="w-10 h-10 rounded-xl glass-panel flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5"
            title="Open sidebar"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Center: main content */}
      <div className="flex-1 flex min-w-0 min-h-0 pt-0 md:pt-0">
        {isSubPage ? (
          <div className="flex-1 overflow-auto p-4 sm:p-6">
            <Outlet />
          </div>
        ) : (
          <AIHome
            activeDepartment={activeAgent}
            onDepartmentChange={setActiveAgent}
          />
        )}
      </div>

      {/* Right: chat panel (overlay on mobile, inline on desktop) or expand button */}
      {chatPanelOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={toggleChatPanel}
            aria-hidden
          />
          <div className="fixed md:relative inset-y-0 right-0 z-50 md:z-auto w-[280px] max-w-[85vw] md:max-w-none md:w-auto md:m-2 md:ml-0 shrink-0 flex flex-col">
            <div className="glass-panel h-full flex flex-col md:flex-row rounded-l-2xl md:rounded-2xl overflow-hidden">
              <div className="flex md:hidden items-center justify-between px-4 py-3 border-b border-sidebar-border shrink-0">
                <span className="font-semibold text-sm">Chat history</span>
                <button
                  type="button"
                  onClick={toggleChatPanel}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <button
                type="button"
                onClick={toggleChatPanel}
                className="hidden md:flex shrink-0 w-8 items-center justify-center border-r border-sidebar-border text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                title="Close chat history"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
              <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
                <ConversationPanel
                  companyId={company?.id}
                  activeConversationId={activeChatId}
                  onNewChat={() => {
                    setActiveAgent(undefined);
                    if (location.pathname !== basePath) navigate(basePath);
                  }}
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="hidden md:flex m-2 ml-0 shrink-0">
          <button
            type="button"
            onClick={toggleChatPanel}
            className="w-10 h-10 rounded-xl glass-panel flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5"
            title="Open chat history"
          >
            <MessageSquare className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();

  // useEffect(() => {
  //   if (!session && !isPending) {
  //     navigate("/login");
  //   }
  // }, [session, isPending, navigate]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-svh app-gradient">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  // if (!session) return null;

  return (
    <CompanyProvider>
      <DashboardInner />
    </CompanyProvider>
  );
}
