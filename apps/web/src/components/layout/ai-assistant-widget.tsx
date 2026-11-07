'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Bot,
  Sparkles,
  X,
  Send,
  RotateCcw,
  ExternalLink,
  Loader2,
  Lightbulb,
  CheckCircle2,
  ChevronLeft,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { reportsApi, CopilotQueryResult } from '@/features/reports/services/reports-api';
import { getErrorMessage } from '@/lib/errors';
import { useStore } from '@/context/store-context';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  result?: CopilotQueryResult;
  isError?: boolean;
}

const STARTER_PROMPTS = [
  { text: "Today's total sales & orders", query: "How much did we sell today?" },
  { text: "Show pharmacy summary", query: "Show me overall sales and transactions this month" },
  { text: "Medicines expiring soon", query: "What medicines are at risk of expiring soon?" },
  { text: "Who owes the most khata?", query: "What is our customer credit balance and who owes us?" },
  { text: "Top 5 selling medicines", query: "What were my top 5 selling medicines this month?" },
  { text: "Critical low & out of stock", query: "What medicines are out of stock or need reordering?" },
  { text: "Branch revenue comparison", query: "Which branch is generating the highest revenue?" },
];

const STORAGE_KEY = 'dispenco_ai_widget_messages_v1';


function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function FormattedMessageText({ text }: { text: string }) {
  const lines = text.split('\n');

  return (
    <div className="space-y-1 text-xs leading-relaxed text-foreground">
      {lines.map((line, idx) => {
        if (!line.trim()) {
          return <div key={idx} className="h-1" />;
        }

        // Parse bold segments (**...**)
        const parts = line.split(/(\*\*.*?\*\*)/g);

        return (
          <p key={idx} className="leading-relaxed">
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={pIdx} className="font-semibold text-foreground">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
}

export function AiAssistantWidget() {
  const { activeStoreId, isAllStores } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chat history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setMessages(JSON.parse(saved));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [messages]);

  // Global Ctrl+K / Cmd+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Scroll to bottom when opening or adding messages
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [isOpen, messages]);

  const handleSend = async (customQuery?: string) => {
    const query = (customQuery || inputQuestion).trim();
    if (!query || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customQuery) setInputQuestion('');
    setLoading(true);

    try {
      const res = await reportsApi.queryCopilot({
        question: query,
        storeId: !isAllStores && activeStoreId ? activeStoreId : undefined,
      });

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: res.narrative,
        timestamp: Date.now(),
        result: res,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err, 'Failed to process your request.');
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `Error: ${errorMsg}. Please try rephrasing your question.`,
        timestamp: Date.now(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <>
      {/* Right-Edge Docked Slide-Out Tab (Never overlaps table buttons; slides out on hover/click) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Close AI Assistant' : 'Open AI Assistant (Ctrl+K)'}
        title={isOpen ? 'Close Assistant' : 'Dispenco AI Assistant (Ctrl+K)'}
        className={`group fixed right-0 bottom-6 sm:bottom-8 z-50 h-11 rounded-l-2xl border border-r-0 border-primary-foreground/15 bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/25 flex items-center gap-2 pl-2.5 pr-3.5 transition-all duration-300 ease-out cursor-pointer print:hidden ${
          isOpen
            ? 'translate-x-0 ring-2 ring-primary/30'
            : 'translate-x-[calc(100%-38px)] hover:translate-x-0 focus-visible:translate-x-0 opacity-85 hover:opacity-100'
        }`}
      >
        {isOpen ? (
          <>
            <X className="size-4.5 shrink-0 transition-transform" />
            <span className="text-xs font-bold tracking-tight whitespace-nowrap">Close AI</span>
          </>
        ) : (
          <>
            <div className="flex items-center gap-0.5 shrink-0">
              <ChevronLeft className="size-3.5 opacity-80 group-hover:opacity-0 group-hover:-translate-x-1 transition-all duration-200 -ml-1" />
              <Bot className="size-4.5 shrink-0" />
            </div>
            <span className="text-xs font-bold tracking-tight whitespace-nowrap pl-0.5">
              AI Copilot
            </span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-primary-foreground/15 text-primary-foreground text-[10px] font-mono font-semibold whitespace-nowrap">
              Ctrl+K
            </kbd>
          </>
        )}
      </button>

      {/* Floating AI Assistant Modal Card */}
      {isOpen && (
        <div
          role="dialog"
          aria-labelledby="ai-assistant-title"
          className="fixed bottom-20 sm:bottom-22 right-3 sm:right-6 z-50 w-[calc(100vw-24px)] sm:w-[430px] max-w-[430px] h-[580px] max-h-[calc(100vh-110px)] bg-card border border-border/90 rounded-3xl shadow-2xl shadow-black/40 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 print:hidden"
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-border/70 bg-muted/20 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <Bot className="size-5" />
              </div>
              <div className="min-w-0">
                <h4
                  id="ai-assistant-title"
                  className="font-bold text-sm text-foreground leading-tight truncate flex items-center gap-1.5"
                >
                  <span>AI Assistant</span>
                  <span className="size-2 rounded-full bg-primary animate-pulse" />
                </h4>
                <p className="text-micro text-muted-foreground leading-tight truncate mt-0.5">
                  Ask anything about your platform
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  title="Clear conversation"
                  className="size-7.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors cursor-pointer"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              )}
              <Link
                href="/reports"
                onClick={() => setIsOpen(false)}
                title="Open in Full Analytics View"
                className="size-7.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors cursor-pointer"
              >
                <ExternalLink className="size-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close"
                className="size-7.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Chat Body */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-card/50"
          >
            {messages.length === 0 ? (
              // Empty State matching user reference screenshot in Dispenco theme
              <div className="h-full flex flex-col justify-center items-center text-center space-y-4 py-4">
                <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-xs shadow-primary/10">
                  <Sparkles className="size-8 text-primary animate-pulse" />
                </div>

                <div className="space-y-1 max-w-xs">
                  <h5 className="font-bold text-base text-foreground">
                    Hi! I&apos;m your Admin AI Assistant
                  </h5>
                  <p className="text-xs text-muted-foreground">
                    Ask me anything about your platform data
                  </p>
                </div>

                {/* Prompt Chips */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 max-w-sm">
                  {STARTER_PROMPTS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(p.query)}
                      className="px-3 py-1.5 rounded-full border border-border/80 bg-muted/30 hover:border-primary/50 hover:bg-primary/10 text-xs text-foreground/80 hover:text-foreground font-medium transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      {p.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Conversation Thread
              <div className="space-y-3.5">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    {msg.sender === 'user' ? (
                      <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-primary text-primary-foreground px-3.5 py-2 text-xs shadow-2xs leading-relaxed font-medium">
                        <p>{msg.text}</p>
                        <span className="block text-[10px] text-primary-foreground/75 text-right mt-0.5 font-normal">
                          {formatTimeAgo(msg.timestamp)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 max-w-[95%]">
                        <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="size-4" />
                        </div>
                        <div className="flex-1 rounded-2xl rounded-tl-xs bg-muted/40 border border-border/80 p-3 text-xs shadow-2xs space-y-1">
                          <FormattedMessageText text={msg.text} />
                          <span className="block text-[10px] text-muted-foreground/70 text-left mt-1 font-normal">
                            {formatTimeAgo(msg.timestamp)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Animated typing dots matching reference screenshot */}
                {loading && (
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Bot className="size-4" />
                    </div>
                    <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-xs bg-muted/50 border border-border/70 flex items-center gap-1.5 shadow-2xs">
                      <span className="size-1.5 rounded-full bg-foreground/60 animate-bounce [animation-delay:-0.3s]" />
                      <span className="size-1.5 rounded-full bg-foreground/60 animate-bounce [animation-delay:-0.15s]" />
                      <span className="size-1.5 rounded-full bg-foreground/60 animate-bounce" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Input Area matching reference screenshot */}
          <div className="p-3 border-t border-border/70 bg-muted/20 space-y-2 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 bg-background border border-border/80 focus-within:border-primary rounded-xl px-3 py-1.5 shadow-2xs transition-colors"
            >
              <Input
                ref={inputRef}
                type="text"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                placeholder="Ask a question..."
                disabled={loading}
                className="border-0 bg-transparent p-0 text-xs placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 h-8 shadow-none"
              />
              <button
                type="submit"
                disabled={loading || !inputQuestion.trim()}
                title="Send query"
                className="size-7.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:hover:bg-primary text-primary-foreground flex items-center justify-center shrink-0 cursor-pointer transition-all shadow-2xs"
              >
                <Send className="size-3.5" />
              </button>
            </form>

            <div className="flex items-center justify-between px-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span>Powered by</span>
                <span className="font-semibold text-foreground/80">Dispenco</span>
              </span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border/70 font-mono text-micro text-muted-foreground/80">
                Ctrl+K
              </kbd>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
