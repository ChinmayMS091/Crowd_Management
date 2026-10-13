
import Link from 'next/link';

const modules = [
    {
        title: 'Video Processing',
        description: 'Upload recorded footage and analyze crowd activity.',
        href: '/',
        icon: '▶',
        label: 'VIDEO ANALYSIS',
    },
    {
        title: 'Live CCTV',
        description: 'Monitor live camera feeds and current crowd conditions.',
        href: '/cctv',
        icon: '◉',
        label: 'LIVE MONITORING',
    },
    {
        title: 'Crowd Predictions',
        description: 'Review future crowd levels and predicted risk.',
        href: '/predictions',
        icon: '↗',
        label: 'RISK FORECASTING',
    },
    {
        title: 'Analytics Dashboard',
        description: 'Review crowd metrics, trends, and system insights.',
        href: '/dashboard',
        icon: '▥',
        label: 'ANALYTICS',
    },
    {
        title: 'Analysis History',
        description: 'View previously processed videos and their results.',
        href: '/analyses',
        icon: '◷',
        label: 'RECORDS',
    },
];

export default function HomeDashboard() {
    return (
        <div className="min-h-screen bg-[#050b18] px-5 py-10 text-white sm:px-8 lg:px-12">
            <div className="mx-auto max-w-7xl">
                <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                    <div>
                        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-blue-400">
                            CrowdSentinel AI
                        </p>
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            Command Center
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                            Monitor crowd safety, analyze CCTV footage, and review
                            crowd-risk predictions from one place.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 self-start rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 sm:self-auto">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                        <div>
                            <p className="text-sm font-medium text-emerald-300">
                                Management Portal
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                Authorized access
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {modules.map((module) => (
                        <Link
                            key={module.href}
                            href={module.href}
                            className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-6 transition duration-200 hover:-translate-y-1 hover:border-blue-500/60 hover:bg-slate-900"
                        >
                            <div className="mb-6 flex items-center justify-between">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-2xl text-blue-300">
                                    {module.icon}
                                </div>
                                <span className="text-xs font-medium tracking-wide text-slate-500">
                                    {module.label}
                                </span>
                            </div>

                            <h2 className="text-xl font-semibold text-slate-100 transition group-hover:text-blue-300">
                                {module.title}
                            </h2>

                            <p className="mt-3 min-h-12 text-sm leading-6 text-slate-400">
                                {module.description}
                            </p>

                            <div className="mt-6 flex items-center gap-2 text-sm font-medium text-blue-400">
                                Open module
                                <span className="transition-transform group-hover:translate-x-1">
                                    →
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
                    <h2 className="text-lg font-semibold">System overview</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                        Use Live CCTV for ongoing monitoring, Video Processing for
                        recorded footage, and Crowd Predictions to review forecast
                        results. Open Analytics or Analysis History to explore
                        available records.
                    </p>
                </div>

                <p className="mt-8 text-center text-xs text-slate-600">
                    CrowdSentinel AI · Crowd Management and Stampede Prevention
                </p>
            </div>
        </div>
    );
}
