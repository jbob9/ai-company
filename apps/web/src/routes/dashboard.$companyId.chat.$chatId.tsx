import { useCompany } from "@/lib/company-context";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bot, ChevronUp, Loader2, Send, User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { env } from "@ai-company/env/web";

const MESSAGES_PAGE_SIZE = 20;

type MessageRow = {
  id: string;
  role: string;
  content: string;
  createdAt: Date | string;
};

export default function ChatByIdPage() {
  const { companyId, chatId } = useParams<{
    companyId: string;
    chatId: string;
  }>();
  const { company } = useCompany();
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState("");
  const [olderMessages, setOlderMessages] = useState<MessageRow[]>([]);
  const [loadMoreBefore, setLoadMoreBefore] = useState<string | null>(null);
  const [hasOlderMore, setHasOlderMore] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const topAnchorRef = useRef<HTMLDivElement>(null);

  const basePath = companyId ? `/dashboard/${companyId}` : "/dashboard";

  const { data: conversation, isLoading: convLoading } = useQuery({
    ...trpc.ai.getConversation.queryOptions({ id: chatId! }),
    enabled: !!chatId,
  });

  const { data: latestPage, isLoading: latestLoading } = useQuery({
    ...trpc.ai.listMessages.queryOptions({
      conversationId: chatId!,
      limit: MESSAGES_PAGE_SIZE,
    }),
    enabled: !!chatId && !!conversation,
  });

  const { data: olderPage, isFetching: olderFetching } = useQuery({
    ...trpc.ai.listMessages.queryOptions({
      conversationId: chatId!,
      limit: MESSAGES_PAGE_SIZE,
      before: loadMoreBefore!,
    }),
    enabled: !!chatId && !!loadMoreBefore,
  });

  useEffect(() => {
    if (olderPage) {
      setOlderMessages((prev) => [...olderPage.messages, ...prev]);
      setHasOlderMore(olderPage.hasMore);
      setLoadMoreBefore(null);
    }
  }, [olderPage]);

  // Historical DB messages
  const dbMessages: MessageRow[] = [
    ...olderMessages,
    ...(latestPage?.messages ?? []),
  ];
  const canLoadOlder =
    dbMessages.length > 0 &&
    (olderMessages.length === 0
      ? (latestPage?.hasMore ?? false)
      : hasOlderMore);

  // useChat for streaming new messages in this conversation
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${env.VITE_SERVER_URL}/api/chat`,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: {
          companyId: companyId ?? "",
          departmentType: conversation?.departmentType ?? undefined,
          conversationId: chatId,
        },
      }),
    [companyId, conversation?.departmentType, chatId],
  );

  const { messages: streamMessages, sendMessage, status, setMessages: setStreamMessages } = useChat({
    id: `chat-${chatId}`,
    transport,
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "listMessages"] });
      queryClient.invalidateQueries({ queryKey: ["ai", "listConversations"] });
    },
  });

  // Reset streaming messages when chatId changes
  useEffect(() => {
    setStreamMessages([]);
  }, [chatId, setStreamMessages]);

  const isStreaming = status === "streaming" || status === "submitted";

  const isLoading =
    convLoading ||
    (!!chatId && !!conversation && latestLoading && dbMessages.length === 0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dbMessages.length, streamMessages.length, isStreaming]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isStreaming) return;
    const text = inputValue.trim();
    setInputValue("");
    sendMessage({ text });
    if (inputRef.current) inputRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleLoadOlder = () => {
    const oldest = dbMessages[0];
    if (!oldest?.createdAt) return;
    const before =
      typeof oldest.createdAt === "string"
        ? oldest.createdAt
        : oldest.createdAt.toISOString();
    setLoadMoreBefore(before);
  };

  function getStreamMessageText(message: (typeof streamMessages)[number]): string {
    return (
      message.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("") ?? ""
    );
  }

  if (!companyId || !chatId) return null;

  const title =
    conversation?.title ||
    (conversation?.departmentType
      ? `${conversation.departmentType} Chat`
      : "Company Chat");

  if (convLoading && !conversation) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading conversation…</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 px-4">
        <p className="text-sm text-muted-foreground">Conversation not found.</p>
        <Link
          to={basePath}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <Link
          to={basePath}
          className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-semibold text-[15px] truncate flex-1 min-w-0">
          {title}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5">
          {canLoadOlder && (
            <div className="flex justify-center py-2">
              <button
                type="button"
                onClick={handleLoadOlder}
                disabled={!!loadMoreBefore || olderFetching}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors disabled:opacity-50"
              >
                {olderFetching || loadMoreBefore ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ChevronUp className="h-3.5 w-3.5" />
                )}
                Load older messages
              </button>
            </div>
          )}
          <div ref={topAnchorRef} />

          {/* Historical messages from DB */}
          {dbMessages.map((message) => (
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
                  {message.content}
                </p>
              </div>
              {message.role === "user" && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-foreground/10 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground/70" />
                </div>
              )}
            </div>
          ))}

          {/* New streaming messages from useChat */}
          {streamMessages.map((message) => {
            const text = getStreamMessageText(message);
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

          {isStreaming && streamMessages.at(-1)?.role !== "assistant" && (
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

      <div className="shrink-0 px-4 sm:px-6 pb-4 sm:pb-5 pt-2">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit}>
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="flex items-end gap-2 p-3">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Continue the conversation…"
                  disabled={isStreaming}
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-[13.5px] placeholder:text-muted-foreground/50 focus:outline-none min-h-[36px] py-2 leading-snug"
                />
              </div>
              <div className="flex justify-end px-3 pb-2.5 pt-0">
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
          </form>
        </div>
      </div>
    </div>
  );
}
