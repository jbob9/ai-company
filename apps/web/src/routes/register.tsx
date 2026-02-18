import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import z from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
  User,
  Building2,
  Check,
  Loader2,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { trpcClient } from "@/utils/trpc";
import Loader from "@/components/loader";
import { ModeToggle } from "@/components/mode-toggle";

type Step = "account" | "company";

const stageOptions = [
  {
    value: "bootstrap",
    label: "Bootstrap",
    desc: "0 - 10 employees",
    emoji: "🌱",
  },
  {
    value: "early",
    label: "Early Stage",
    desc: "10 - 50 employees",
    emoji: "🚀",
  },
  {
    value: "growth",
    label: "Growth",
    desc: "50 - 200 employees",
    emoji: "📈",
  },
  {
    value: "scale",
    label: "Scale",
    desc: "200+ employees",
    emoji: "🏢",
  },
];

const industryOptions = [
  "SaaS",
  "E-commerce",
  "Fintech",
  "Healthcare",
  "Education",
  "Media",
  "Marketplace",
  "Other",
];

export default function Register() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const [step, setStep] = useState<Step>("account");
  const [showPassword, setShowPassword] = useState(false);

  // Account fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountErrors, setAccountErrors] = useState<Record<string, string>>({});

  // Company fields
  const [companyName, setCompanyName] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [companyStage, setCompanyStage] = useState("bootstrap");
  const [companyIndustry, setCompanyIndustry] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");

  const [isSigningUp, setIsSigningUp] = useState(false);

  const createCompany = useMutation({
    mutationFn: () =>
      trpcClient.company.create.mutate({
        name: companyName,
        stage: companyStage as "bootstrap" | "early" | "growth" | "scale",
        description: companyDescription || undefined,
        industry: companyIndustry || undefined,
        website: companyWebsite || undefined,
        employeeCount: employeeCount ? parseInt(employeeCount) : undefined,
      }),
    onSuccess: async (company) => {
      if (company) {
        await trpcClient.department.initializeForStage.mutate({
          companyId: company.id,
          stage: companyStage as "bootstrap" | "early" | "growth" | "scale",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["company"] });
      toast.success("Welcome to Orchestrator!");
      navigate("/dashboard/" + (company?.id || ""));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (sessionPending) return <Loader />;
  if (session && step === "account") {
    setStep("company");
  }

  const accountSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.email("Please enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  });

  function handleAccountNext() {
    const result = accountSchema.safeParse({ name, email, password });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[String(issue.path[0])] = issue.message;
        }
      });
      setAccountErrors(errors);
      return;
    }
    setAccountErrors({});
    setIsSigningUp(true);

    authClient.signUp.email(
      { name, email, password },
      {
        onSuccess: () => {
          setIsSigningUp(false);
          setStep("company");
        },
        onError: (error) => {
          setIsSigningUp(false);
          toast.error(error.error.message || "Failed to create account");
        },
      },
    );
  }

  function handleCompanySubmit() {
    if (!companyName.trim()) {
      toast.error("Please enter your company name");
      return;
    }
    createCompany.mutate();
  }

  function handleSkipCompany() {
    navigate("/dashboard");
  }

  const isAccountStep = step === "account";

  return (
    <div className="flex items-center justify-center min-h-full px-4 sm:px-6 py-6 sm:py-10 relative min-w-0">
      <Link
        to="/"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 text-[12px] sm:text-[13px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        Home
      </Link>
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ModeToggle />
      </div>

      <div className="w-full max-w-lg min-w-0">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold transition-colors ${
                isAccountStep
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/15 text-primary"
              }`}
            >
              {!isAccountStep ? <Check className="h-4 w-4" /> : "1"}
            </div>
            <span
              className={`text-[12px] font-medium ${
                isAccountStep ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              Account
            </span>
          </div>

          <div className="w-10 h-px bg-border" />

          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold transition-colors ${
                !isAccountStep
                  ? "bg-primary text-primary-foreground"
                  : "bg-foreground/5 text-muted-foreground"
              }`}
            >
              2
            </div>
            <span
              className={`text-[12px] font-medium ${
                !isAccountStep ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              Company
            </span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
            {isAccountStep ? (
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            ) : (
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">
            {isAccountStep ? "Create your account" : "Set up your company"}
          </h1>
          <p className="text-[13px] text-muted-foreground">
            {isAccountStep
              ? "Tell us a bit about yourself to get started"
              : "Add your company details so your AI can understand your context"}
          </p>
        </div>

        {/* Step 1: Account */}
        {isAccountStep && (
          <div className="glass-panel rounded-2xl p-4 sm:p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-foreground/80 mb-1.5">
                  Full name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  autoFocus
                  className="w-full h-10 px-3.5 rounded-xl glass-input text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                />
                {accountErrors.name && (
                  <p className="text-[11px] text-destructive mt-1.5">{accountErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground/80 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@company.com"
                  autoComplete="email"
                  className="w-full h-10 px-3.5 rounded-xl glass-input text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                />
                {accountErrors.email && (
                  <p className="text-[11px] text-destructive mt-1.5">{accountErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground/80 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    className="w-full h-10 px-3.5 pr-10 rounded-xl glass-input text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground/70 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {accountErrors.password && (
                  <p className="text-[11px] text-destructive mt-1.5">{accountErrors.password}</p>
                )}
                {password.length > 0 && !accountErrors.password && (
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          password.length >= i * 3
                            ? password.length >= 12
                              ? "bg-green-500"
                              : password.length >= 8
                                ? "bg-amber-500"
                                : "bg-red-400"
                            : "bg-foreground/5"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleAccountNext}
                disabled={isSigningUp}
                className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2 mt-2"
              >
                {isSigningUp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Company */}
        {!isAccountStep && (
          <div className="glass-panel rounded-2xl p-4 sm:p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-foreground/80 mb-1.5">
                  Company name <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Inc."
                  autoFocus
                  className="w-full h-10 px-3.5 rounded-xl glass-input text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground/80 mb-1.5">
                  What does your company do?
                </label>
                <textarea
                  value={companyDescription}
                  onChange={(e) => setCompanyDescription(e.target.value)}
                  placeholder="Brief description of your company, product, or service..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground/80 mb-2">
                  Company stage
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {stageOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCompanyStage(opt.value)}
                      className={`p-3 rounded-xl text-left transition-all ${
                        companyStage === opt.value
                          ? "glass-panel ring-2 ring-primary/30 bg-primary/5"
                          : "glass-input hover:bg-foreground/2"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[14px]">{opt.emoji}</span>
                        <span className="text-[12.5px] font-semibold">{opt.label}</span>
                      </div>
                      <p className="text-[10.5px] text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground/80 mb-2">
                  Industry
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {industryOptions.map((ind) => (
                    <button
                      key={ind}
                      type="button"
                      onClick={() => setCompanyIndustry(companyIndustry === ind ? "" : ind)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                        companyIndustry === ind
                          ? "bg-primary text-primary-foreground"
                          : "glass-input text-foreground/70 hover:text-foreground hover:bg-foreground/3"
                      }`}
                    >
                      {ind}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground/80 mb-1.5">
                    Website
                  </label>
                  <input
                    type="url"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="https://acme.com"
                    className="w-full h-10 px-3.5 rounded-xl glass-input text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground/80 mb-1.5">
                    Team size
                  </label>
                  <input
                    type="number"
                    value={employeeCount}
                    onChange={(e) => setEmployeeCount(e.target.value)}
                    placeholder="e.g. 25"
                    className="w-full h-10 px-3.5 rounded-xl glass-input text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSkipCompany}
                  className="flex-1 h-10 rounded-xl glass-input text-[13px] font-medium text-foreground/60 hover:text-foreground hover:bg-foreground/3 transition-colors"
                >
                  Skip for now
                </button>
                <button
                  onClick={handleCompanySubmit}
                  disabled={createCompany.isPending}
                  className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                >
                  {createCompany.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Launch
                      <Sparkles className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {isAccountStep && (
          <p className="text-center text-[12.5px] text-muted-foreground mt-5">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
