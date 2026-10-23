
'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AuthResponse {
    access_token: string;
    token_type: string;
    user: {
        id: number;
        email: string;
        full_name: string;
        role: string;
        is_active: boolean;
    };
}

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function handleLogin(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(
                'http://localhost:8000/api/auth/login',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: email.trim(),
                        password,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setError(
                    typeof data.detail === 'string'
                        ? data.detail
                        : 'Unable to sign in. Check your credentials.'
                );
                return;
            }

            const auth = data as AuthResponse;

            if (!auth.access_token || !auth.user?.role) {
                setError('Invalid response received from the server.');
                return;
            }

            if (!auth.user.is_active) {
                setError('Your account is inactive. Contact the administrator.');
                return;
            }

            const allowedRoles = [
                'owner',
                'security_head',
                'security_guard',
            ];

            if (!allowedRoles.includes(auth.user.role)) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                setError('Your account does not have an authorized role.');
                return;
            }

            localStorage.setItem('access_token', auth.access_token);
            localStorage.setItem('user', JSON.stringify(auth.user));

            if (['owner', 'security_head'].includes(auth.user.role)) {
                const cookieResponse = await fetch('/api/live/stream/webcam', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${auth.access_token}`,
                    },
                });

                if (!cookieResponse.ok) {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('user');
                    setError(
                        'Unable to initialize the video stream. Please try again.'
                    );
                    return;
                }
            }

            switch (auth.user.role) {
                case 'owner':
                case 'security_head':
                    router.replace('/');
                    break;

                case 'security_guard':
                    router.replace('/communication');
                    break;

                default:
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('user');
                    setError('Your account does not have an authorized role.');
            }
        } catch {
            setError(
                'Cannot connect to the server. Check that the backend is running.'
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="relative flex min-h-[calc(100dvh-4rem)] w-full flex-1 items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 sm:px-6">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden"
            >
                <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
                <div className="absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-violet-200/40 blur-3xl" />
                <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-100/30 blur-3xl" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:40px_40px]" />
            </div>

            <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60 md:min-h-[560px] md:grid-cols-2">
                <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-800 p-10 text-white md:flex lg:p-12">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0"
                    >
                        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full border border-white/10" />
                        <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full border border-white/10" />
                        <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-white/5 blur-2xl" />
                    </div>

                    <div className="relative">
                        <div className="mb-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-xl font-bold shadow-lg shadow-blue-950/10 backdrop-blur-sm">
                            CS
                        </div>

                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                            Intelligent Crowd Safety
                        </p>

                        <h2 className="text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
                            CrowdManagement
                            <span className="mt-1 block text-blue-200">AI</span>
                        </h2>

                        <p className="mt-6 max-w-sm text-sm leading-7 text-blue-100/90">
                            Monitor crowd activity, analyze CCTV feeds, and
                            turn crowd insights into safer, faster decisions.
                        </p>
                    </div>

                    <div className="relative rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 3 5 6v5c0 4.5 2.9 7.6 7 10 4.1-2.4 7-5.5 7-10V6l-7-3Z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="m9 12 2 2 4-4"
                                    />
                                </svg>
                            </div>

                            <div>
                                <p className="text-sm font-semibold">
                                    Secure access
                                </p>
                                <p className="mt-1 text-xs leading-5 text-blue-100/80">
                                    Access is restricted to authorized personnel
                                    according to their assigned role.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="flex items-center justify-center px-6 py-10 sm:px-10 md:px-12">
                    <div className="w-full max-w-sm">
                        <div className="mb-8 md:hidden">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-lg font-bold text-white shadow-lg shadow-blue-200">
                                CS
                            </div>

                            <p className="text-sm font-semibold text-blue-700">
                                CrowdManagement AI
                            </p>
                        </div>

                        <div className="mb-8">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                                Welcome back
                            </p>

                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                                Sign in to your account
                            </h1>

                            <p className="mt-3 text-sm leading-6 text-slate-500">
                                Enter your credentials to access your crowd
                                safety dashboard.
                            </p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label
                                    htmlFor="email"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    Email address
                                </label>

                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="username"
                                    required
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                    placeholder="name@example.com"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                />
                            </div>

                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <label
                                        htmlFor="password"
                                        className="block text-sm font-semibold text-slate-700"
                                    >
                                        Password
                                    </label>
                                </div>

                                <div className="relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(event) =>
                                            setPassword(event.target.value)
                                        }
                                        placeholder="Enter your password"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-16 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword((current) => !current)
                                        }
                                        className="absolute inset-y-0 right-3 text-xs font-semibold text-slate-500 transition hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        aria-label={
                                            showPassword
                                                ? 'Hide password'
                                                : 'Show password'
                                        }
                                    >
                                        {showPassword ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div
                                    role="alert"
                                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
                                >
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-200/60 transition hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading && (
                                    <svg
                                        className="h-4 w-4 animate-spin"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        aria-hidden="true"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-90"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
                                        />
                                    </svg>
                                )}
                                {loading ? 'Signing in...' : 'Sign in securely'}
                            </button>
                        </form>

                        <div className="mt-8 border-t border-slate-100 pt-5">
                            <div className="flex items-center justify-center gap-2 text-slate-500">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.7"
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                >
                                    <rect
                                        x="5"
                                        y="10"
                                        width="14"
                                        height="11"
                                        rx="2"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M8 10V7a4 4 0 0 1 8 0v3"
                                    />
                                </svg>
                                <p className="text-xs">
                                    Protected system · Authorized personnel only
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
