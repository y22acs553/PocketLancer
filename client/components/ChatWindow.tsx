"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Loader2 } from "lucide-react";
import socket from "@/services/socket";
import api from "@/services/api";
import { useUser } from "@/context/UserContext";

interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
}

interface Props {
  freelancerId: string;
  freelancerName: string;
  freelancerAvatar?: string;
  onClose: () => void;
}

function timeLabel(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ChatWindow({
  freelancerId,
  freelancerName,
  freelancerAvatar,
  onClose,
}: Props) {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load message history
  useEffect(() => {
    if (!freelancerId) return;
    setLoading(true);
    // ✅ correct path: /message/ not /messages/
    api
      .get(`/message/${freelancerId}`)
      .then((r) => setMessages(r.data.messages || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [freelancerId]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Socket listener for incoming messages
  // ✅ Use user?._id (string primitive) NOT user (object) — object reference
  //    changes on every context re-render causing an infinite loop that
  //    freezes the app and triggers constant Next.js hot-reload ("compiling").
  const userId = user?._id;
  useEffect(() => {
    if (!userId) return;

    const handler = (msg: Message) => {
      const isRelevant =
        (msg.senderId?.toString() === freelancerId &&
          msg.receiverId?.toString() === userId) ||
        (msg.senderId?.toString() === userId &&
          msg.receiverId?.toString() === freelancerId);

      if (isRelevant) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }
    };

    socket.on("new_message", handler);
    return () => {
      socket.off("new_message", handler);
    };
  }, [userId, freelancerId]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !userId) return;

    setSending(true);
    setText("");

    try {
      // ✅ correct path: /message/ not /messages/
      const res = await api.post(`/message/${freelancerId}`, { text: trimmed });
      const sent = res.data.message;
      // Append for sender immediately (server only emits to receiver)
      setMessages((prev) => {
        if (prev.some((m) => m._id === sent._id)) return prev;
        return [...prev, sent];
      });
    } catch {
      setText(trimmed); // restore on failure
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 rounded-3xl border border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden dark:bg-slate-950 dark:border-slate-800"
      style={{ maxHeight: "480px" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b dark:border-slate-800 bg-slate-900 dark:bg-slate-800">
        <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
          {freelancerName?.slice(0, 1).toUpperCase() ?? "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white truncate">
            {freelancerName}
          </p>
          <p className="text-xs font-bold text-slate-400">Chat</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 transition"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ minHeight: 200 }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <Loader2 className="animate-spin" size={22} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 py-8">
            <p className="text-sm font-bold">No messages yet</p>
            <p className="text-xs">Say hello 👋</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.senderId?.toString() === userId;
            return (
              <div
                key={m._id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm font-bold leading-snug ${
                    isMine
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-br-sm"
                      : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white rounded-bl-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p className="text-[10px] mt-1 font-bold text-slate-400">
                    {timeLabel(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t dark:border-slate-800 flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          className="flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white placeholder:text-slate-400"
          style={{ maxHeight: 96 }}
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-2xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-white dark:text-slate-900 transition"
        >
          {sending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>
    </div>
  );
}
