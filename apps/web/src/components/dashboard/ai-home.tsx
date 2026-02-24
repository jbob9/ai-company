import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useCompany } from "@/lib/company-context";
import { cn } from "@/lib/utils";
import {
  MODEL_PRESETS,
  getDefaultPreset,
  type ModelPreset,
  type ModelPresetId,
} from "@ai-company/ai";
import { env } from "@ai-company/env/web";
import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import {
  AlertCircle,
  Bot,
  Building2,
  Loader2,
  Mic,
  Paperclip,
  Send,
  SlidersHorizontal,
  Sparkles,
  User,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

interface AIHomeProps {
  activeDepartment?: string;
  onDepartmentChange?: (dept: string | undefined) => void;
}

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

export function AIHome({ activeDepartment, onDepartmentChange }: AIHomeProps) {
  const { company } = useCompany();
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [modelPresetId, setModelPresetId] = useState<ModelPresetId>(
    () => getDefaultPreset().id,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const userName = session?.user?.name?.split(" ")[0] || "there";
  const agentLabel = activeDepartment
    ? deptLabels[activeDepartment] || "Department AI"
    : "Orchestrator";

  const selectedPreset =
    MODEL_PRESETS.find((p: ModelPreset) => p.id === modelPresetId) ??
    getDefaultPreset();
  console.log(selectedPreset, "selectedPreset");
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${env.VITE_SERVER_URL}/api/chat`,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: {
          companyId: company?.id ?? "",
          departmentType: activeDepartment,
          conversationId: conversationId ?? undefined,
          modelPresetId,
        },
      }),
    [company?.id, activeDepartment, conversationId, modelPresetId],
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    id: `home-${company?.id ?? "none"}-${activeDepartment ?? "orchestrator"}`,
    transport,
    onFinish: ({ message }) => {
      const meta = message.metadata as Record<string, unknown> | undefined;
      const newConvId = meta?.conversationId as string | undefined;
      if (newConvId && !conversationId) {
        setConversationId(newConvId);
        queryClient.invalidateQueries({
          queryKey: ["ai", "listConversations"],
        });
        if (company?.id) {
          navigate(`/dashboard/${company.id}/chat/${newConvId}`);
        }
      }
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";
  const isInChat = messages.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setMessages([]);
    setConversationId(null);
  }, [activeDepartment, setMessages]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isStreaming) return;

    const text = inputValue.trim();
    setInputValue("");
    sendMessage({ text });

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInputValue("");
    sendMessage({ text: prompt });
  };

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = "auto";
    target.style.height = Math.min(target.scrollHeight, 120) + "px";
  };

  const quickActions = [
    {
      icon: Sparkles,
      title: "Analyze company",
      desc: "Get a full health assessment across all departments",
      prompt:
        "Give me a comprehensive analysis of our company health across all departments. What are the key strengths, concerns, and recommended actions?",
    },
    {
      icon: Building2,
      title: "Department insights",
      desc: "Deep dive into any department's performance",
      prompt:
        "What department needs the most attention right now? Give me a breakdown of each department's status and any critical issues.",
    },
    {
      icon: AlertCircle,
      title: "Review alerts",
      desc: "Understand active alerts and recommended actions",
      prompt:
        "Are there any critical alerts or issues I should be aware of? What immediate actions do you recommend?",
    },
  ];

  function getMessageText(message: (typeof messages)[number]): string {
    return (
      message.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("") ?? ""
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      {!isInChat ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 sm:mb-6">
            <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2 text-center">
            Welcome, {userName}!
          </h1>
          <p className="text-muted-foreground text-sm sm:text-[15px] mb-6 sm:mb-10 text-center">
            How can I help you with{" "}
            <span className="font-medium text-foreground">
              {company?.name || "your company"}
            </span>{" "}
            today?
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-xl mb-8 sm:mb-10">
            {quickActions.map((action) => (
              <button
                key={action.title}
                onClick={() => handleQuickAction(action.prompt)}
                className="glass-panel rounded-2xl p-4 text-left hover:bg-foreground/4 transition-all group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                  <action.icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <h3 className="text-[13.5px] font-semibold mb-1">
                  {action.title}
                </h3>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                  {action.desc}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5">
            {messages.map((message) => {
              const text = getMessageText(message);
              if (!text) return null;
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2 sm:gap-3",
                    message.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[90%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "glass-panel",
                    )}
                  >
                    <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">
                      {text}
                    </p>
                  </div>
                  {message.role === "user" && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-foreground/10 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground/70" />
                    </div>
                  )}
                </div>
              );
            })}
            {isStreaming && messages.at(-1)?.role !== "assistant" && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="glass-panel rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse [animation-delay:150ms]" />
                    <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      <div className="px-4 sm:px-6 pb-4 sm:pb-5 pt-2">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit}>
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="flex items-end gap-2 p-3">
                <Sparkles className="h-4 w-4 text-primary/50 mb-2.5 shrink-0" />
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onInput={handleTextareaInput}
                  placeholder={
                    "Ask " + agentLabel + " anything about your company..."
                  }
                  disabled={isStreaming}
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-[13.5px] placeholder:text-muted-foreground/50 focus:outline-none min-h-[36px] py-2 leading-snug"
                />
              </div>
              <div className="flex items-center justify-between px-3 pb-2.5 pt-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-muted-foreground hover:text-foreground rounded-lg hover:bg-foreground/4 transition-colors"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Attach
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      type="button"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-muted-foreground hover:text-foreground rounded-lg hover:bg-foreground/4 transition-colors outline-none"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      <span className="hidden lg:inline">
                        {selectedPreset.label}
                      </span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel className="text-[11px]">
                          AI Model
                        </DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                          value={modelPresetId}
                          onValueChange={(value) =>
                            setModelPresetId(value as ModelPresetId)
                          }
                        >
                          {MODEL_PRESETS.map((preset) => (
                            <DropdownMenuRadioItem
                              key={preset.id}
                              value={preset.id}
                              className="text-[12px]"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {preset.label}
                                </span>
                                {preset.description && (
                                  <span className="text-[11px] text-muted-foreground">
                                    {preset.description}
                                  </span>
                                )}
                              </div>
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/4 transition-colors"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isStreaming}
                    className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                      inputValue.trim() && !isStreaming
                        ? "bg-primary text-primary-foreground hover:opacity-90"
                        : "bg-foreground/10 text-muted-foreground",
                    )}
                  >
                    {isStreaming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
