import { Link } from "react-router";
import {
  ArrowRight,
  Sparkles,
  Building2,
  BarChart3,
  Brain,
  MessageSquare,
  Shield,
  Zap,
  TrendingUp,
  Users,
  Bot,
  Layers,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { ModeToggle } from "@/components/mode-toggle";

import type { Route } from "./+types/_index";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "AI Company Orchestrator" },
    {
      name: "description",
      content:
        "AI-powered company management. Get real-time insights, smart recommendations, and department-level intelligence to make better decisions faster.",
    },
  ];
}

const features = [
  {
    icon: Brain,
    title: "AI-Powered Insights",
    description:
      "Get deep analysis across every department. The orchestrator synthesizes data to surface what matters most.",
  },
  {
    icon: MessageSquare,
    title: "Natural Conversations",
    description:
      "Ask questions in plain language. Chat with department-specific AI agents or the company-wide orchestrator.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Metrics",
    description:
      "Track KPIs across Product, Engineering, Sales, Marketing, Finance, and more, all in one place.",
  },
  {
    icon: Zap,
    title: "Proactive Alerts",
    description:
      "Get notified before problems escalate. AI continuously monitors thresholds and detects emerging patterns.",
  },
  {
    icon: TrendingUp,
    title: "Smart Recommendations",
    description:
      "Receive prioritized, actionable recommendations based on cross-department analysis and historical outcomes.",
  },
  {
    icon: Shield,
    title: "Decision Support",
    description:
      "Every suggestion comes with context, alternatives, and predicted impact so you can decide with confidence.",
  },
];

const departments = [
  { icon: "P", label: "Product", color: "bg-blue-500/15 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400" },
  { icon: "E", label: "Engineering", color: "bg-violet-500/15 text-violet-600 dark:bg-violet-400/15 dark:text-violet-400" },
  { icon: "S", label: "Sales", color: "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400" },
  { icon: "M", label: "Marketing", color: "bg-pink-500/15 text-pink-600 dark:bg-pink-400/15 dark:text-pink-400" },
  { icon: "F", label: "Finance", color: "bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400" },
  { icon: "CS", label: "Customer Success", color: "bg-teal-500/15 text-teal-600 dark:bg-teal-400/15 dark:text-teal-400" },
  { icon: "HR", label: "HR / People", color: "bg-rose-500/15 text-rose-600 dark:bg-rose-400/15 dark:text-rose-400" },
  { icon: "O", label: "Operations", color: "bg-sky-500/15 text-sky-600 dark:bg-sky-400/15 dark:text-sky-400" },
];

export default function Home() {
  const { data: session } = authClient.useSession();

  return (
    <div className="h-full overflow-y-auto">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="text-primary"
              >
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="font-semibold text-[15px] tracking-tight truncate">Orchestrator</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ModeToggle className="shrink-0" />
            {session ? (
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
              >
                Dashboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 sm:px-4 py-2 text-[12px] sm:text-[13px] font-medium text-foreground/70 hover:text-foreground transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-[12px] sm:text-[13px] font-medium bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
                >
                  Get Started
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel text-[11px] sm:text-[12px] font-medium text-muted-foreground mb-6 sm:mb-8">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">AI-powered company intelligence</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-4 sm:mb-6">
            Your company&apos;s
            <br />
            <span className="text-primary">AI brain</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mb-8 sm:mb-10 px-1">
            Ask questions about any department. Get instant analysis, smart
            recommendations, and proactive alerts. Make better decisions, faster.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {session ? (
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-6 py-3 text-[14px] font-medium bg-primary text-primary-foreground rounded-2xl hover:opacity-90 transition-opacity"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="flex items-center gap-2 px-6 py-3 text-[14px] font-medium bg-primary text-primary-foreground rounded-2xl hover:opacity-90 transition-opacity"
                >
                  Start for free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="px-6 py-3 text-[14px] font-medium text-foreground/70 hover:text-foreground glass-panel rounded-2xl transition-colors"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Preview mock */}
      <section className="px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="mx-auto max-w-4xl">
          <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[13px] font-semibold">Orchestrator AI</p>
                <p className="text-[11px] text-muted-foreground">Company-wide intelligence</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-end">
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-3 sm:px-4 py-2.5 max-w-[85%] sm:max-w-sm">
                  <p className="text-[12px] sm:text-[13px]">
                    What department needs the most attention right now?
                  </p>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="glass-input rounded-2xl rounded-tl-md px-3 sm:px-4 py-3 max-w-[95%] sm:max-w-lg">
                  <p className="text-[12px] sm:text-[13px] leading-relaxed">
                    Based on current metrics, <strong>Sales</strong> requires immediate attention.
                    Pipeline velocity has dropped 23% this month while your MRR target gap is
                    widening. I recommend reviewing the lead qualification process and scheduling a
                    pipeline review with the team. Want me to dive deeper into the sales metrics?
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 sm:mb-3">
              Everything you need to lead smarter
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto px-1">
              One AI that understands your entire company, not just one slice of it.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass-panel rounded-2xl p-6 hover:bg-foreground/2 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-[14px] font-semibold mb-1.5">{feature.title}</h3>
                <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Departments */}
      <section className="px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 sm:mb-3">
              AI agents for every department
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto px-1">
              Each department gets its own specialized AI agent that understands
              the unique metrics, challenges, and goals of that function.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {departments.map((dept) => (
              <div
                key={dept.label}
                className="glass-panel rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center hover:bg-foreground/2 transition-colors"
              >
                <div
                  className={`w-11 h-11 rounded-xl ${dept.color} flex items-center justify-center mx-auto mb-3 text-[13px] font-bold`}
                >
                  {dept.icon}
                </div>
                <p className="text-[13px] font-medium">{dept.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 sm:mb-3">
              How it works
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto px-1">
              Get up and running in minutes, not months.
            </p>
          </div>

          <div className="grid gap-4 sm:gap-6 sm:grid-cols-3">
            {[
              {
                step: "01",
                icon: Users,
                title: "Create your company",
                description:
                  "Set up your company profile, add departments, and configure the metrics that matter.",
              },
              {
                step: "02",
                icon: Layers,
                title: "Connect your data",
                description:
                  "Integrate with Stripe, HubSpot, Linear, and more. Or manually input your key metrics.",
              },
              {
                step: "03",
                icon: MessageSquare,
                title: "Start asking questions",
                description:
                  "Chat with your AI orchestrator or department agents. Get insights instantly.",
              },
            ].map((item) => (
              <div key={item.step} className="glass-panel rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[11px] font-bold text-primary/60 bg-primary/10 px-2 py-0.5 rounded-full">
                    {item.step}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-[14px] font-semibold mb-1.5">{item.title}</h3>
                <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="mx-auto max-w-3xl">
          <div className="glass-panel rounded-2xl sm:rounded-3xl p-6 sm:p-10 lg:p-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Ready to orchestrate smarter?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Join teams using AI to make faster, more informed decisions across
              every department.
            </p>
            {session ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 text-[14px] font-medium bg-primary text-primary-foreground rounded-2xl hover:opacity-90 transition-opacity"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3 text-[14px] font-medium bg-primary text-primary-foreground rounded-2xl hover:opacity-90 transition-opacity"
              >
                Get started for free
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-6 pb-8 sm:pb-10">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-3 py-5 sm:py-6 border-t border-border/40 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                className="text-primary"
              >
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-[12px] font-medium text-muted-foreground">Orchestrator</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Built with AI. Designed for leaders.
          </p>
        </div>
      </footer>
    </div>
  );
}
