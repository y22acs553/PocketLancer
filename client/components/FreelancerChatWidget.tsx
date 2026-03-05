"use client";

/**
 * FreelancerChatWidget — Floating chat button shown on all pages.
 *
 * FIXES:
 * 1. API path fixed: /message/ not /messages/
 * 2. Unread count only loaded when user is logged in AND widget is opened
 * 3. No API calls block navigation or page render
 * 4. Badge only increments for RECEIVER, never for SENDER
 */

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, ChevronDown } from "lucide-react";
import socket from "@/services/socket";
import { useUser } from "@/context/UserContext";
import api from "@/services/api";
import ChatWindow from "./ChatWindow";

interface Conversation {
  conversationId: string;
  partner: { _id: string; name: string; profilePic?: string } | null;
  lastMessage: {
    _id: string;
    text: string;
    senderId: string;
    receiverId: string;
    createdAt: string;
  };
  unreadCount: number;
}

export default function FreelancerChatWidget() {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<{
    userId: string;
    name: string;
    avatar?: string;
  } | null>(null);
  const [loadingConvos, setLoadingConvos] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Listen for "open-chat" events dispatched by profile pages
  // This avoids importing ChatWindow or socket in every page
  useEffect(() => {
    const handler = (e: Event) => {
      const { userId, name, avatar } = (e as CustomEvent).detail;
      if (userId) {
        setActiveChat({ userId, name, avatar });
        setOpen(false);
      }
    };
    window.addEventListener("open-chat", handler);
    return () => window.removeEventListener("open-chat", handler);
  }, []);

  // Load unread count once after login — non-blocking
  useEffect(() => {
    if (!user?._id) return;
    // ✅ correct path: /message/ not /messages/
    api
      .get("/message/unread/count")
      .then((r) => setTotalUnread(r.data.count || 0))
      .catch(() => {}); // silently ignore — never crash the app
  }, [user?._id]);

  // Socket: listen for new messages — only count if WE are the receiver
  const userId = user?._id;
  useEffect(() => {
    if (!userId) return;

    const handler = (msg: any) => {
      // ✅ Only increment badge for receiver, NEVER for sender
      if (msg.receiverId?.toString() === userId) {
        setTotalUnread((n) => n + 1);
      }
    };

    socket.on("new_message", handler);
    return () => {
      socket.off("new_message", handler);
    };
  }, [userId]);

  // Load conversations when panel opens
  useEffect(() => {
    if (!open || !user?._id) return;
    setLoadingConvos(true);
    // ✅ correct path: /message/ not /messages/
    api
      .get("/message/conversations/list")
      .then((r) => setConversations(r.data.conversations || []))
      .catch(() => {})
      .finally(() => setLoadingConvos(false));
  }, [open, user?._id]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpenConversation = (conv: Conversation) => {
    if (!conv.partner) return;
    setActiveChat({
      userId: conv.partner._id,
      name: conv.partner.name,
      avatar: conv.partner.profilePic,
    });
    setOpen(false);
    // Reduce badge count
    setConversations((prev) =>
      prev.map((c) =>
        c.conversationId === conv.conversationId ? { ...c, unreadCount: 0 } : c,
      ),
    );
    setTotalUnread((n) => Math.max(0, n - conv.unreadCount));
  };

  // Don't render anything if user is not logged in
  if (!user) return null;

  return (
    <>
      {/* Active chat window */}
      {activeChat && (
        <ChatWindow
          freelancerId={activeChat.userId}
          freelancerName={activeChat.name}
          freelancerAvatar={activeChat.avatar}
          onClose={() => setActiveChat(null)}
        />
      )}

      {/* Floating button + panel */}
      <div
        ref={widgetRef}
        className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
      >
        {/* Conversations panel */}
        {open && !activeChat && (
          <div className="w-80 rounded-3xl border border-slate-200 bg-white shadow-2xl dark:bg-slate-950 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b dark:border-slate-800">
              <p className="font-black text-slate-900 dark:text-white">
                Messages
              </p>
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={15} />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loadingConvos ? (
                <div className="flex items-center justify-center py-8 text-slate-400 text-sm font-bold">
                  Loading…
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
                  <MessageCircle size={28} />
                  <p className="text-sm font-bold">No conversations yet</p>
                  <p className="text-xs">
                    Visit a freelancer profile to start chatting
                  </p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.conversationId}
                    onClick={() => handleOpenConversation(conv)}
                    className="w-full flex items-center gap-3 px-5 py-3 border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900 dark:border-slate-800/60 text-left transition"
                  >
                    <div className="h-9 w-9 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-black text-sm flex-shrink-0">
                      {conv.partner?.name?.slice(0, 1).toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                          {conv.partner?.name ?? "Unknown"}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="flex-shrink-0 h-5 min-w-[20px] px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-400 truncate mt-0.5">
                        {conv.lastMessage?.senderId?.toString() === user._id
                          ? `You: ${conv.lastMessage.text}`
                          : (conv.lastMessage?.text ?? "")}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* FAB */}
        <button
          onClick={() => setOpen((s) => !s)}
          className="relative h-14 w-14 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          title="Messages"
        >
          {open ? <ChevronDown size={22} /> : <MessageCircle size={22} />}
          {totalUnread > 0 && !open && (
            <span className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">
              {totalUnread > 9 ? "9+" : totalUnread}
            </span>
          )}
        </button>
      </div>
    </>
  );
}
