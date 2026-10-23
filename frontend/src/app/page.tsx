import Link from "next/link";

const modules = [
    {
        title: "Video Processing",
        description: "Upload recorded footage and analyze crowd activity.",
        href: "/videoprocessing",
        icon: "▶",
        label: "VIDEO ANALYSIS",
        gradient: "from-blue-500 to-cyan-400",
        iconBg: "bg-blue-50 text-blue-600",
    },
    {
        title: "Live CCTV",
        description: "Monitor live camera feeds and current crowd conditions.",
        href: "/cctv",
        icon: "◉",
        label: "LIVE MONITORING",
        gradient: "from-emerald-500 to-teal-400",
        iconBg: "bg-emerald-50 text-emerald-600",
    },
    {
        title: "Crowd Predictions",
        description: "Review future crowd levels and predicted risk.",
        href: "/predictions",
        icon: "↗",
        label: "RISK FORECASTING",
        gradient: "from-violet-500 to-purple-400",
        iconBg: "bg-violet-50 text-violet-600",
    },
    {
        title: "Analytics Dashboard",
        description: "Review crowd metrics, trends, and system insights.",
        href: "/dashboard",
        icon: "▥",
        label: "ANALYTICS",
        gradient: "from-orange-500 to-amber-400",
        iconBg: "bg-orange-50 text-orange-600",
    },
    {
        title: "Analysis History",
        description: "View previously processed videos and their results.",
        href: "/analyses",
        icon: "◷",
        label: "RECORDS",
        gradient: "from-pink-500 to-rose-400",
        iconBg: "bg-pink-50 text-pink-600",
    },
];

export default function HomeDashboard() {
    return (
        <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/50 px-5 py-8 text-slate-900 sm:px-8 sm:py-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
                <section className="relative mb-10 overflow-hidden rounded-3xl border border-blue-100/80 bg-white p-6 shadow-sm sm:p-9 lg:p-10">
                    <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-gradient-to-br from-blue-100 to-violet-100 opacity-70 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-32 right-1/4 h-56 w-56 rounded-full bg-cyan-100/60 blur-3xl" />

                    <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-center">
                        <div className="max-w-3xl">
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5">
                                <span className="h-2 w-2 rounded-full bg-blue-600" />
                                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                                    CrowdManagement AI
                                </span>
                            </div>

                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                                Command{" "}
                                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                                    Center
                                </span>
                            </h1>

                            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                                Your central workspace for crowd safety, live
                                surveillance, video analysis, and predictive risk
                                intelligence.
                            </p>

                            <div className="mt-7 flex flex-wrap gap-3">
                                <Link
                                    href="/cctv"
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-600/25"
                                >
                                    <span>◉</span>
                                    Open Live CCTV
                                    <span>→</span>
                                </Link>

                                <Link
                                    href="/dashboard"
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                >
                                    View Analytics
                                    <span>↗</span>
                                </Link>
                            </div>
                        </div>

                        <div className="relative w-full shrink-0 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 sm:p-6 lg:w-64">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        className="h-6 w-6"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M12 3 20 7v5c0 4.5-3.1 7.4-8 9-4.9-1.6-8-4.5-8-9V7l8-4Z"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="m8.5 12 2.2 2.2 4.8-5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </div>

                                <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                        Management Portal
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Authorized workspace
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 border-t border-emerald-100 pt-4">
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    <span className="text-xs font-medium text-emerald-700">
                                        Crowd intelligence tools
                                    </span>
                                </div>
                                <p className="mt-2 text-xs leading-5 text-slate-500">
                                    Access monitoring, analysis, and forecasting
                                    from one workspace.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mb-10">
                    <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                                Workspace
                            </p>
                            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                                Explore modules
                            </h2>
                            <p className="mt-2 text-sm text-slate-500">
                                Choose a tool to continue your crowd management
                                workflow.
                            </p>
                        </div>

                        <span className="text-xs font-medium text-slate-400">
                            {modules.length} available modules
                        </span>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {modules.map((module) => (
                            <Link
                                key={module.title}
                                href={module.href}
                                className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/60"
                            >
                                <div
                                    className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${module.gradient} opacity-80 transition-opacity group-hover:opacity-100`}
                                />

                                <div className="mb-6 flex items-start justify-between gap-3">
                                    <div
                                        className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition duration-200 group-hover:scale-105 ${module.iconBg}`}
                                    >
                                        {module.icon}
                                    </div>

                                    <span className="rounded-full border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-[10px] font-semibold tracking-wide text-slate-500">
                                        {module.label}
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold text-slate-800 transition group-hover:text-blue-700">
                                    {module.title}
                                </h3>

                                <p className="mt-3 min-h-[48px] text-sm leading-6 text-slate-500">
                                    {module.description}
                                </p>

                                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                                    <span className="text-sm font-semibold text-blue-600">
                                        Open module
                                    </span>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition group-hover:translate-x-1 group-hover:bg-blue-50 group-hover:text-blue-700">
                                        →
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-violet-100 text-xl text-blue-700">
                            ✦
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-slate-800">
                                Your crowd safety workflow
                            </h2>
                            <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-500">
                                Start with live CCTV monitoring or analyze
                                recorded footage. Review prediction results to
                                understand forecast crowd risk, then use the
                                analytics dashboard and analysis history to
                                explore the available metrics and records.
                            </p>
                        </div>
                    </div>
                </section>

                <footer className="pb-2 pt-8 text-center text-xs text-slate-400">
                    CrowdManagement AI
                    <span className="mx-2 text-slate-300">•</span>
                    Crowd Management &amp; Stampede Prevention
                </footer>
            </div>
        </div>
    );
}