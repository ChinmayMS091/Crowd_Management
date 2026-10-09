
'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
    const router = useRouter();

    function handleLogout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        router.replace('/login');
    }

    return (
        <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10"
        >
            Logout
        </button>
    );
}
