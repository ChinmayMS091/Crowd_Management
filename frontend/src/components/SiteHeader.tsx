"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LogoutButton from "./LogoutButton";

const navigation = [
    {
        label: "Overview",
        href: "/",
        icon: "⌂",
    },
    {
        label: "Video Analysis",
        href: "/videoprocessing",
        icon: "▣",
    },
    {
        label: "Live CCTV",
        href: "/cctv",
        icon: "◉",
    },
    {
        label: "Predictions",
        href: "/predictions",
        icon: "⌁",
    },
    {
        label: "Communication",
        href: "/communication",
        icon: "◌",
    },
];

export default function SiteHeader() {
    const pathname = usePathname();
    const [role, setRole] = useState<string | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const readUser = () => {
            const storedUser = localStorage.getItem("user");

            if (!storedUser) {
                setRole(null);
                return;
            }

            try {
                const user = JSON.parse(storedUser);
                setRole(user.role ?? null);
            } catch {
                setRole(null);
            }
        };

        readUser();
        window.addEventListener("storage", readUser);

        return () => {
            window.removeEventListener("storage", readUser);
        };
    }, [pathname]);

    useEffect(() => {
        setMenuOpen(false);
    }, [pathname]);

    if (pathname === "/login" || role === "security_guard") {
        return null;
    }

    return (
        <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-slate-950/95 text-white shadow-lg shadow-black/10 backdrop-blur-xl">
            <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
                <div className="flex min-h-[72px] items-center justify-between gap-4">
                    <Link
                        href="/"
                        className="group flex shrink-0 items-center gap-3"
                        aria-label="CrowdSentinel AI home"
                    >
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/20 to-blue-600/20 text-cyan-300 shadow-lg shadow-cyan-950/30 transition group-hover:border-cyan-300/40">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                className="h-6 w-6"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                aria-hidden="true"
                            >
                                <path
                                    d="M12 3 20 7v5c0 4.5-3.1 7.4-8 9-4.9-1.6-8-4.5-8-9V7l8-4Z"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M8 13h2l1.3-3 2 6 1.2-3H17"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>

                        <div className="leading-tight">
                            <span className="block text-base font-bold tracking-tight text-white sm:text-lg">
                                CrowdSentinel
                                <span className="text-cyan-400"> AI</span>
                            </span>
                            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                Crowd Intelligence
                            </span>
                        </div>
                    </Link>

                    <nav
                        aria-label="Main navigation"
                        className="hidden items-center gap-1 xl:flex"
                    >
                        {navigation.map((item) => {
                            const active =
                                item.href === "/"
                                    ? pathname === "/"
                                    : pathname === item.href ||
                                    pathname.startsWith(`${item.href}/`);

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    aria-current={active ? "page" : undefined}
                                    className={`group relative flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${active
                                        ? "bg-cyan-400/10 text-cyan-300"
                                        : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                                        }`}
                                >
                                    <span className="text-base" aria-hidden="true">
                                        {item.icon}
                                    </span>
                                    {item.label}

                                    {active && (
                                        <span className="absolute inset-x-3 -bottom-[1px] h-0.5 rounded-full bg-cyan-400" />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="hidden shrink-0 items-center gap-4 xl:flex">
                        <div className="h-8 w-px bg-white/10" />
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.06] px-3 py-2">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                            </span>
                            <span className="text-xs font-medium text-emerald-300">
                                Monitoring
                            </span>
                        </div>
                        <LogoutButton />
                    </div>

                    <button
                        type="button"
                        onClick={() => setMenuOpen((open) => !open)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-200 transition hover:bg-white/10 xl:hidden"
                        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
                        aria-expanded={menuOpen}
                        aria-controls="mobile-navigation"
                    >
                        {menuOpen ? (
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                className="h-5 w-5"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden="true"
                            >
                                <path
                                    d="m6 6 12 12M18 6 6 18"
                                    strokeLinecap="round"
                                />
                            </svg>
                        ) : (
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                className="h-5 w-5"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden="true"
                            >
                                <path
                                    d="M4 7h16M4 12h16M4 17h16"
                                    strokeLinecap="round"
                                />
                            </svg>
                        )}
                    </button>
                </div>

                {menuOpen && (
                    <div
                        id="mobile-navigation"
                        className="border-t border-white/[0.08] py-4 xl:hidden"
                    >
                        <nav
                            aria-label="Mobile navigation"
                            className="flex flex-col gap-1"
                        >
                            {navigation.map((item) => {
                                const active =
                                    item.href === "/"
                                        ? pathname === "/"
                                        : pathname === item.href ||
                                        pathname.startsWith(`${item.href}/`);

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        aria-current={active ? "page" : undefined}
                                        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${active
                                            ? "border border-cyan-400/10 bg-cyan-400/10 text-cyan-300"
                                            : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                                            }`}
                                    >
                                        <span className="w-5 text-center text-base" aria-hidden="true">
                                            {item.icon}
                                        </span>
                                        {item.label}
                                        {active && (
                                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400" />
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="mt-4 flex items-center justify-between border-t border-white/[0.08] pt-4">
                            <div className="flex items-center gap-2 px-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                <span className="text-xs text-slate-400">
                                    System navigation
                                </span>
                            </div>
                            <LogoutButton />
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}