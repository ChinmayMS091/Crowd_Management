
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

            // Store authentication details after successful login.
            localStorage.setItem('access_token', auth.access_token);
            localStorage.setItem('user', JSON.stringify(auth.user));

            // Redirect according to the authenticated user's role.
            switch (auth.user.role) {
                case 'owner':
                case 'security_head':
                    router.replace('/home');
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
        <section className="relative flex min-h-[calc(100dvh-4rem)] w-full flex-1 items-center justify-center overflow-hidden bg-[#050b18] px-5 py-10">
            {/* Background decoration */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden"
            >
                <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
                <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.035)_1px,transparent_1px)] bg-[size:40px_40px]" />
            </div>

            <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-900/90 shadow-2xl shadow-black/40 md:min-h-[540px] md:grid-cols-2">
                {/* Branding panel */}
                <div className="hidden flex-col justify-between bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950 p-12 md:flex">
                    <div>
                        <div className="mb-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/30 bg-blue-500/10 text-2xl font-bold text-blue-300">
                            CS
                        </div>

                        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">
                            Intelligent Crowd Safety
                        </p>

                        <h2 className="text-4xl font-bold leading-tight text-white">
                            CrowdManagement
                            <span className="block text-blue-400">AI</span>
                        </h2>

                        <p className="mt-6 max-w-sm leading-7 text-slate-400">
                            Monitor crowd activity, analyze live CCTV feeds, and
                            support safer decisions with AI-powered insights.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-700/70 bg-slate-950/40 p-5">
                        <p className="text-sm font-medium text-slate-200">
                            Secure access for authorized personnel
                        </p>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                            Access to system features depends on your assigned role.
                        </p>
                    </div>
                </div>

                {/* Login form */}
                <div className="flex items-center justify-center px-6 py-10 sm:px-10 md:px-12">
                    <div className="w-full max-w-sm">
                        <div className="mb-8 md:hidden">
                            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-500/10 font-bold text-blue-300">
                                CS
                            </div>

                            <h1 className="text-2xl font-bold text-white">
                                CrowdSentinel AI
                            </h1>

                            <p className="mt-2 text-sm text-slate-400">
                                Intelligent crowd safety platform
                            </p>
                        </div>

                        <div className="mb-8">
                            <h1 className="text-3xl font-bold tracking-tight text-white">
                                Welcome back
                            </h1>

                            <p className="mt-3 text-sm leading-6 text-slate-400">
                                Sign in with your assigned account to continue.
                            </p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label
                                    htmlFor="email"
                                    className="mb-2 block text-sm font-medium text-slate-200"
                                >
                                    Email address
                                </label>

                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="username"
                                    required
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="name@example.com"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="password"
                                    className="mb-2 block text-sm font-medium text-slate-200"
                                >
                                    Password
                                </label>

                                <input
                                    id="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

                            {error && (
                                <div
                                    role="alert"
                                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-300"
                                >
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? 'Signing in...' : 'Sign in to your account'}
                            </button>
                        </form>

                        <div className="mt-8 border-t border-slate-800 pt-5">
                            <p className="text-center text-xs leading-5 text-slate-500">
                                Protected system · Authorized personnel only
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
