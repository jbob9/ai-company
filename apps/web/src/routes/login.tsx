import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import z from "zod";
import { ArrowLeft, Sparkles, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import Loader from "@/components/loader";
import { ModeToggle } from "@/components/mode-toggle";

export default function Login() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            navigate("/dashboard");
            toast.success("Welcome back!");
          },
          onError: (error) => {
            toast.error(error.error.message || "Invalid credentials");
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Please enter a valid email"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  if (isPending) return <Loader />;
  if (session) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="flex items-center justify-center h-full px-4 sm:px-6 relative min-w-0">
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
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 sm:mb-5">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1.5">Welcome back</h1>
          <p className="text-[12px] sm:text-[13px] text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-4 sm:p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-4"
          >
            <form.Field name="email">
              {(field) => (
                <div>
                  <label
                    htmlFor={field.name}
                    className="block text-[12px] font-medium text-foreground/80 mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    id={field.name}
                    name={field.name}
                    type="email"
                    autoComplete="email"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full h-10 px-3.5 rounded-xl glass-input text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                  />
                  {field.state.meta.errors.map((error) => (
                    <p key={error?.message} className="text-[11px] text-destructive mt-1.5">
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <div>
                  <label
                    htmlFor={field.name}
                    className="block text-[12px] font-medium text-foreground/80 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id={field.name}
                      name={field.name}
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full h-10 px-3.5 pr-10 rounded-xl glass-input text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground/70 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {field.state.meta.errors.map((error) => (
                    <p key={error?.message} className="text-[11px] text-destructive mt-1.5">
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Subscribe>
              {(state) => (
                <button
                  type="submit"
                  disabled={!state.canSubmit || state.isSubmitting}
                  className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity mt-2"
                >
                  {state.isSubmitting ? "Signing in..." : "Sign in"}
                </button>
              )}
            </form.Subscribe>
          </form>
        </div>

        <p className="text-center text-[12.5px] text-muted-foreground mt-5">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="text-primary font-medium hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
