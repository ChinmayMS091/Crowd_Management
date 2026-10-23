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
            className="group inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-red-100 active:translate-y-0"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
            >
                <path
                    d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M16 17l5-5-5-5M21 12H9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            <span>Logout</span>
        </button>
    );
}
