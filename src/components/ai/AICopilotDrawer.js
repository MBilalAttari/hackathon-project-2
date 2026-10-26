"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/lib/constants";
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  CheckCircle2,
  XCircle,
  Calendar,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "../common/UI";

export function AICopilotDrawer({ isOpen, onClose }) {
  const { user, role, fetchWithAuth } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello ${user?.name || "there"}! I am your HCM Lite AI Assistant. How can I help you today? You can ask about office timings, tax calculation, check your leave balances, or tell me to draft a leave request.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const quickPrompts = [
    "What are the office hours & grace period?",
    "How many casual and sick leaves do I have left?",
    "I need 2 days sick leave from tomorrow due to severe fever",
    "How is income tax calculated on PKR 250,000?",
    ...(role !== ROLES.EMPLOYEE
      ? ["Give me org headcount and today's attendance summary"]
      : []),
  ];

  const handleSend = async (textToSend) => {
    const text = textToSend || input.trim();
    if (!text || loading) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetchWithAuth("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          chatHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to communicate with AI");
      }

      const assistantMsg = {
        id: `ai_${Date.now()}`,
        role: "assistant",
        content: data.reply,
        draftAction: data.draftAction || null,
        toolUsed: data.toolUsed || null,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: `⚠️ Error: ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // User confirms the drafted leave request
  const handleConfirmLeaveDraft = async (msgId, draft) => {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: draft.employeeId,
          leaveType: draft.leaveType,
          startDate: draft.startDate,
          endDate: draft.endDate,
          days: draft.days,
          reason: draft.reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit leave");

      // Update message to reflect confirmation
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                draftAction: null,
                content: `${m.content}\n\n✅ **Confirmed & Submitted:** Your leave application (#${data.leave?.id}) has been forwarded to HR/Admin for approval.`,
              }
            : m
        )
      );
    } catch (err) {
      alert(`Error submitting leave: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelLeaveDraft = (msgId) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              draftAction: null,
              content: `${m.content}\n\n❌ *Draft cancelled by user.*`,
            }
          : m
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs">
            <Sparkles className="w-4 h-4 text-yellow-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              HCM Lite AI Assistant
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Authorized Copilot • Server Tool Calling
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}

            <div className="max-w-[85%] space-y-2">
              <div
                className={`p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs border border-slate-200/60 dark:border-slate-700/60"
                }`}
              >
                {m.content}
              </div>

              {/* Interactive Smart Leave Form Confirmation Card */}
              {m.draftAction && m.draftAction.requiresUserConfirmation && (
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-blue-200 dark:border-blue-900 shadow-md space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      Review Leave Application
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Leave Type:</span>
                      <span className="font-semibold uppercase text-slate-900 dark:text-slate-100">
                        {m.draftAction.draft.leaveType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Dates:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {m.draftAction.draft.startDate} to {m.draftAction.draft.endDate}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Duration:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {m.draftAction.draft.days} day(s)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Current Balance:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {m.draftAction.draft.currentBalance} days
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Balance After:</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {m.draftAction.draft.remainingAfterApproval} days
                      </span>
                    </div>
                    {m.draftAction.draft.reason && (
                      <div className="pt-1 text-slate-600 dark:text-slate-300 italic border-t border-slate-100 dark:border-slate-700/60">
                        Reason: &quot;{m.draftAction.draft.reason}&quot;
                      </div>
                    )}
                  </div>

                  {/* Confirmation Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="primary"
                      className="w-full text-xs"
                      icon={CheckCircle2}
                      loading={loading}
                      onClick={() => handleConfirmLeaveDraft(m.id, m.draftAction.draft)}
                    >
                      Confirm & Submit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => handleCancelLeaveDraft(m.id)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {m.role === "user" && (
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 pl-8">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>AI Copilot thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          Suggested Prompts
        </p>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-left text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input Field */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about policies, leaves, attendance..."
            className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
          <Button
            type="submit"
            size="md"
            variant="primary"
            disabled={!input.trim() || loading}
            className="px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
