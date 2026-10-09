
'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE_URL = 'http://localhost:8000';

type Role = 'owner' | 'security_head' | 'security_guard';

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
    owner_head: 'Owner ↔ Security Head',
    head_guards: 'Security Head ↔ Guards',
} as const;

export default function CommunicationPage() {
    const router = useRouter();

    const [user, setUser] = useState<StoredUser | null>(null);
    const [channel, setChannel] = useState<keyof typeof CHANNELS | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const storedUser = localStorage.getItem('user');

        if (!token || !storedUser) {
            router.replace('/login');
            return;
        }

        try {
            const parsed = JSON.parse(storedUser) as StoredUser;

            if (
                !parsed.is_active ||
                !['owner', 'security_head', 'security_guard'].includes(parsed.role)
            ) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                router.replace('/login');
                return;
            }

            setUser(parsed);

            if (parsed.role === 'owner') {
                setChannel('owner_head');
            } else if (parsed.role === 'security_head') {
                setChannel('owner_head');
            } else {
                setChannel('head_guards');
            }
        } catch {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            router.replace('/login');
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        if (!user || !channel) return;

        let cancelled = false;

        async function loadMessages() {
            const token = localStorage.getItem('access_token');
            if (!token) return;

            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/communication/messages?channel=${channel}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        cache: 'no-store',
                    },
                );

                if (response.status === 401) {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('user');
                    router.replace('/login');
                    return;
                }

                if (!response.ok) {
                    throw new Error(`Unable to load messages (${response.status})`);
                }

                const data = (await response.json()) as Message[];
                if (!cancelled) {
                    setMessages(data);
                    setError('');
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error ? err.message : 'Unable to load messages',
                    );
                }
            }
        }

        void loadMessages();

        return () => {
            cancelled = true;
        };
    }, [user, channel, router]);

    async function handleSend(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const trimmed = content.trim();
        const token = localStorage.getItem('access_token');

        if (!trimmed || !token || !channel || sending) return;

        setSending(true);
        setError('');

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/communication/messages`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        channel,
                        content: trimmed,
                    }),
                },
            );

            if (response.status === 401) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                router.replace('/login');
                return;
            }

            if (!response.ok) {
                const detail = await response.json().catch(() => null);
                throw new Error(
                    detail?.detail || `Unable to send message (${response.status})`,
                );
            }

            const savedMessage = (await response.json()) as Message;

            setMessages((previous) => [...previous, savedMessage]);
            setContent('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to send message');
        } finally {
            setSending(false);
        }
    }

    if (loading || !user) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center bg-[#050b18] text-slate-300">
                Loading communication...
            </div>
        );
    }

    const availableChannels =
        user.role === 'owner'
            ? (['owner_head'] as const)
            : user.role === 'security_head'
                ? (['owner_head', 'head_guards'] as const)
                : (['head_guards'] as const);

    return (
        <div className="min-h-screen bg-[#050b18] px-4 py-6 text-slate-100 sm:px-8">
            <div className="mx-auto max-w-5xl">
                <div className="mb-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
                        CrowdSentinel AI
                    </p>
                    <h1 className="mt-2 text-3xl font-bold">Communication Center</h1>
                    <p className="mt-2 text-slate-400">
                        Signed in as {user.full_name} · {user.role.replace('_', ' ')}
                    </p>
                </div>

                <div className="grid gap-5 md:grid-cols-[240px_1fr]">
                    <aside className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
                            Channels
                        </h2>

                        <div className="space-y-2">
                            {availableChannels.map((item) => (
                                <button
                                    key={item}
                                    onClick={() => setChannel(item)}
                                    className={`w-full rounded-xl px-3 py-3 text-left text-sm transition ${channel === item
                                        ? 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/40'
                                        : 'text-slate-300 hover:bg-slate-800'
                                        }`}
                                >
                                    {CHANNELS[item]}
                                </button>
                            ))}
                        </div>

                        <div className="mt-6 rounded-xl bg-slate-800/70 p-3 text-xs leading-5 text-slate-400">
                            Channel access is enforced by the backend according to your role.
                        </div>
                    </aside>

                    <section className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/70">
                        <div className="border-b border-slate-700 px-5 py-4">
                            <h2 className="font-semibold">
                                {channel ? CHANNELS[channel] : 'Select a channel'}
                            </h2>
                            <p className="mt-1 text-xs text-slate-400">
                                Messages are stored in the project database.
                            </p>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto p-5">
                            {error && (
                                <div
                                    role="alert"
                                    className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
                                >
                                    {error}
                                </div>
                            )}

                            {messages.length === 0 && !error && (
                                <div className="py-16 text-center text-sm text-slate-500">
                                    No messages yet. Start the conversation.
                                </div>
                            )}

                            {messages.map((message) => {
                                const ownMessage = message.sender_id === user.id;

                                return (
                                    <div
                                        key={message.id}
                                        className={`flex ${ownMessage ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-2xl px-4 py-3 ${ownMessage
                                                ? 'bg-cyan-600/20 ring-1 ring-cyan-500/30'
                                                : 'bg-slate-800'
                                                }`}
                                        >
                                            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                                                <span className="font-semibold text-cyan-300">
                                                    {ownMessage ? 'You' : message.sender_name}
                                                </span>
                                                <span className="text-slate-500">
                                                    {new Date(message.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="whitespace-pre-wrap break-words text-sm leading-6">
                                                {message.content}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <form
                            onSubmit={handleSend}
                            className="flex gap-3 border-t border-slate-700 p-4"
                        >
                            <input
                                value={content}
                                onChange={(event) => setContent(event.target.value)}
                                maxLength={2000}
                                placeholder="Write a message..."
                                aria-label="Message"
                                className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-cyan-500"
                            />
                            <button
                                type="submit"
                                disabled={!content.trim() || sending || !channel}
                                className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {sending ? 'Sending...' : 'Send'}
                            </button>
                        </form>
                    </section>
                </div>
            </div>
        </div>
    );
}
