
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type UserRole = 'owner' | 'security_head' | 'security_guard';

interface StoredUser {
    id: number;
    email: string;
    full_name: string;
    role: UserRole;
    is_active: boolean;
}

const OPERATIONAL_PATHS = [
    '/',
    '/home',
    '/analyses',
    '/cctv',
    '/dashboard',
    '/predictions',
];

export default function AuthGuard({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [checking, setChecking] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        // Login must remain accessible without authentication.
        if (pathname === '/login') {
            setAuthorized(true);
            setChecking(false);
            return;
        }

        const token = localStorage.getItem('access_token');
        const storedUser = localStorage.getItem('user');

        if (!token || !storedUser) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            router.replace('/login');
            return;
        }

        let user: StoredUser;

        try {
            user = JSON.parse(storedUser) as StoredUser;
        } catch {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            router.replace('/login');
            return;
        }

        if (
            !user.is_active ||
            !['owner', 'security_head', 'security_guard'].includes(user.role)
        ) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            router.replace('/login');
            return;
        }

        const isOperationalPage = OPERATIONAL_PATHS.some((path) =>
            path === '/'
                ? pathname === '/'
                : pathname === path || pathname.startsWith(`${path}/`)
        );

        // Guards may access communication, but not operational pages.
        if (user.role === 'security_guard' && isOperationalPage) {
            router.replace('/communication');
            return;
        }

        setAuthorized(true);
        setChecking(false);
    }, [pathname, router]);

    if (checking || !authorized) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center bg-[#050b18] text-slate-300">
                Checking access...
            </div>
        );
    }

    return <>{children}</>;
}
