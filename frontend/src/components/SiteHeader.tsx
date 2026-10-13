"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LogoutButton from "./LogoutButton";


export default function SiteHeader() {
    const pathname = usePathname();
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");

        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setRole(user.role);
            } catch {
                setRole(null);
            }
        }
    }, [pathname]);

    if (pathname === "/login" || role === "security_guard") {
        return null;
    }
    return (
        <nav className="border-b border-slate-800 bg-slate-900">
            <div className="container mx-auto px-6">
                <div className="flex h-16 items-center justify-between">
                    <Link
                        href="/"
                        className="text-xl font-bold text-white transition-colors hover:text-blue-400"
                    >
                        CrowdManagement AI
                    </Link>

                    <div className="flex items-center gap-2">
                        <Link
                            href="/videoprocessing"
                            className="rounded-lg px-4 py-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                        >
                            Video Processing
                        </Link>

                        <Link
                            href="/cctv"
                            className="rounded-lg px-4 py-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                        >
                            Live CCTV
                        </Link>


                        <Link
                            href="/predictions"
                            className="rounded-lg px-4 py-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                        >
                            Prediction
                        </Link>

                        <Link
                            href="/communication"
                            className="rounded-lg px-4 py-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                        >
                            Communication
                        </Link>

                        <LogoutButton />
                    </div>
                </div>
            </div>
        </nav>
    );
}