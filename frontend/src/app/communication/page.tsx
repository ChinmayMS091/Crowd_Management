
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

const API_BASE_URL = "http://localhost:8000";

type Role = "owner" | "security_head" | "security_guard";

interface StoredUser {
    id: number;
    email: string;
    full_name: string;
    role: Role;
    is_active: boolean;
}

interface Message {
    id: number;
    sender_id: number;
    channel: string;
    content: string;
    created_at: string;
    sender_name: string;
}

const CHANNELS = {
    owner_head: "Owner ↔ Security Head",
    head_guards: "Security Head ↔ Guards",
} as const;

export default function CommunicationPage() {
    const router = useRouter();

    const [user, setUser] = useState<StoredUser | null>(null);
    const [channel, setChannel] = useState<keyof typeof CHANNELS | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        const storedUser = localStorage.getItem("user");

        if (!token || !storedUser) {
            router.replace("/login");
            return;
        }

        try {
            const parsed = JSON.parse(storedUser) as StoredUser;

            if (
                !parsed.is_active ||
                !["owner", "security_head", "security_guard"].includes(parsed.role)
            ) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("user");
                router.replace("/login");
                return;
            }

            setUser(parsed);

            if (parsed.role === "owner") {
                setChannel("owner_head");
            } else {
                setChannel("head_guards");
            }
        } catch {
            localStorage.removeItem("access_token");
            localStorage.removeItem("user");
            router.replace("/login");
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        if (!user || !channel) return;

        let cancelled = false;

        async function loadMessages() {
            const token = localStorage.getItem("access_token");
            if (!token) return;

            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/communication/messages?channel=${channel}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        cache: "no-store",
                    }
                );

                if (response.status === 401) {
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("user");
                    router.replace("/login");
                    return;
                }

                if (!response.ok) {
                    throw new Error(`Unable to load messages (${response.status})`);
                }

                const data = (await response.json()) as Message[];

                if (!cancelled) {
                    setMessages(data);
                    setError("");
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error ? err.message : "Unable to load messages"
                    );
                }
            }
        }

        setMessages([]);
        void loadMessages();

        const interval = setInterval(() => {
            void loadMessages();
        }, 3000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [user, channel, router]);

    async function handleSend(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const trimmed = content.trim();
        const token = localStorage.getItem("access_token");

        if (!trimmed || !token || !channel || sending) return;

        setSending(true);
        setError("");

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/communication/messages`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        channel,
                        content: trimmed,
                    }),
                }
            );

            if (response.status === 401) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("user");
                router.replace("/login");
                return;
            }

            if (!response.ok) {
                const detail = await response.json().catch(() => null);
                throw new Error(
                    detail?.detail || `Unable to send message (${response.status})`
                );
            }

            const savedMessage = (await response.json()) as Message;

            setMessages((previous) => {
                if (previous.some((message) => message.id === savedMessage.id)) {
                    return previous;
                }
                return [...previous, savedMessage];
            });

            setContent("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to send message");
        } finally {
            setSending(false);
        }
    }

    if (loading || !user) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 text-slate-600">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                    <span className="text-sm font-medium">
                        Loading communication center...
                    </span>
                </div>
            </div>
        );
    }

    const availableChannels =
        user.role === "owner"
            ? (["owner_head"] as const)
            : user.role === "security_head"
                ? (["owner_head", "head_guards"] as const)
                : (["head_guards"] as const);

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/60 px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
            <div className="mx-auto max-w-7xl">
                <section className="relative mb-8 overflow-hidden rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
                    <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-blue-100 to-violet-100 opacity-80 blur-3xl" />

                    <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                        <div>
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                                <span className="h-2 w-2 rounded-full bg-blue-600" />
                                Team coordination
                            </div>

                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                                Communication{" "}
                                <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                                    Center
                                </span>
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                                Coordinate security operations, share updates, and keep your
                                crowd-management team connected.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 self-start rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 sm:self-auto">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="m5 12 4 4L19 6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-emerald-800">
                                    Team messaging
                                </p>
                                <p className="mt-1 text-xs text-emerald-700">
                                    Refreshes automatically
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="mb-6 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                >
                                    <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500">
                                    Total messages
                                </p>
                                <p className="mt-1 text-2xl font-bold text-slate-900">
                                    {messages.length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                >
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="10" cy="7" r="4" />
                                    <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500">
                                    Signed-in user
                                </p>
                                <p className="mt-1 truncate text-base font-bold text-slate-900">
                                    {user.full_name}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                >
                                    <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
                                    <path d="m9 12 2 2 4-4" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500">
                                    Access role
                                </p>
                                <p className="mt-1 text-base font-bold capitalize text-slate-900">
                                    {user.role.replace("_", " ")}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                                Workspace
                            </p>
                            <h2 className="mt-2 text-xl font-bold text-slate-900">
                                Message channels
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Select a channel available to your role.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {availableChannels.map((item) => {
                                const active = channel === item;

                                return (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => setChannel(item)}
                                        className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${active
                                            ? "border-blue-200 bg-gradient-to-r from-blue-50 to-violet-50 shadow-sm"
                                            : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                                            }`}
                                    >
                                        <div
                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active
                                                ? "bg-blue-100 text-blue-700"
                                                : "bg-slate-100 text-slate-600"
                                                }`}
                                        >
                                            <svg
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.8"
                                                className="h-5 w-5"
                                                aria-hidden="true"
                                            >
                                                <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
                                            </svg>
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p
                                                className={`text-sm font-semibold ${active ? "text-blue-800" : "text-slate-800"
                                                    }`}
                                            >
                                                {CHANNELS[item]}
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                {item === "owner_head"
                                                    ? "Management coordination"
                                                    : "Security team coordination"}
                                            </p>
                                        </div>

                                        {active && (
                                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                            <div className="flex items-center gap-2 text-blue-800">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                >
                                    <rect x="3" y="11" width="18" height="11" rx="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                <p className="text-xs font-semibold">Role-based access</p>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-slate-600">
                                Channel permissions are enforced by the backend according to
                                your role.
                            </p>
                        </div>

                    </aside>

                    <section className="flex min-h-[600px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-white to-blue-50/50 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-sm">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        className="h-5 w-5"
                                        aria-hidden="true"
                                    >
                                        <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
                                    </svg>
                                </div>

                                <div>
                                    <h2 className="font-bold text-slate-900">
                                        {channel ? CHANNELS[channel] : "Select a channel"}
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Messages are stored in the project database.
                                    </p>
                                </div>
                            </div>

                            <div className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 sm:self-auto">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                                <span className="text-xs font-semibold text-emerald-700">
                                    Auto-refresh enabled
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-slate-50/70 to-white p-4 sm:p-6">
                            {error && (
                                <div
                                    role="alert"
                                    className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                                >
                                    <span className="font-bold">!</span>
                                    <span>{error}</span>
                                </div>
                            )}

                            {messages.length === 0 && !error && (
                                <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-white text-blue-600 shadow-sm">
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.6"
                                            className="h-8 w-8"
                                            aria-hidden="true"
                                        >
                                            <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
                                        </svg>
                                    </div>
                                    <h3 className="mt-5 text-base font-semibold text-slate-800">
                                        No messages yet
                                    </h3>
                                    <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                                        Start the conversation by sending a message to this
                                        channel.
                                    </p>
                                </div>
                            )}

                            {messages.map((message) => {
                                const ownMessage = message.sender_id === user.id;

                                return (
                                    <div
                                        key={message.id}
                                        className={`flex ${ownMessage ? "justify-end" : "justify-start"
                                            }`}
                                    >
                                        <div
                                            className={`max-w-[90%] rounded-2xl border px-4 py-3 shadow-sm sm:max-w-[80%] ${ownMessage
                                                ? "border-blue-100 bg-gradient-to-br from-blue-50 to-violet-50"
                                                : "border-slate-200 bg-white"
                                                }`}
                                        >
                                            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                                                <span
                                                    className={`text-xs font-bold ${ownMessage ? "text-blue-700" : "text-slate-800"
                                                        }`}
                                                >
                                                    {ownMessage ? "You" : message.sender_name}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {new Date(message.created_at).toLocaleString()}
                                                </span>
                                            </div>

                                            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                                                {message.content}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <form
                            onSubmit={handleSend}
                            className="border-t border-slate-200 bg-white p-4 sm:p-5"
                        >
                            <label
                                htmlFor="message-input"
                                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500"
                            >
                                Your message
                            </label>

                            <div className="flex items-end gap-3">
                                <textarea
                                    id="message-input"
                                    value={content}
                                    onChange={(event) => setContent(event.target.value)}
                                    maxLength={2000}
                                    rows={2}
                                    placeholder="Write a message to your team..."
                                    aria-label="Message"
                                    className="min-h-[48px] min-w-0 flex-1 resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                                />

                                <button
                                    type="submit"
                                    disabled={!content.trim() || sending || !channel}
                                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:px-5"
                                >
                                    {sending ? (
                                        <>
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                            <span className="hidden sm:inline">Sending...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.8"
                                                className="h-4 w-4"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    d="m22 2-7 20-4-9-9-4 20-7Z"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                                <path
                                                    d="M22 2 11 13"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                            <span>Send</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="mt-2 flex justify-between gap-3 text-[11px] text-slate-400">
                                <span>Messages refresh automatically every 3 seconds.</span>
                                <span>{content.length}/2000</span>
                            </div>
                        </form>
                    </section>
                </div>

                <footer className="py-8 text-center text-xs text-slate-400">
                    CrowdManagement AI
                    <span className="mx-2 text-slate-300">·</span>
                    Crowd Management &amp; Stampede Prevention
                </footer>
            </div>
        </main>
    );
}
