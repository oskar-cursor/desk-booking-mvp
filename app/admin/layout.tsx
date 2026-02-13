"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

const TABS = [
  { id: "desks", label: "Biurka", href: "/admin/desks" },
  { id: "parking", label: "Parkingi", href: "/admin/parking" },
  { id: "users", label: "Użytkownicy", href: "/admin/users" },
  { id: "reservations", label: "Rezerwacje", href: "/admin/reservations" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && (session?.user as { role?: string })?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Ładowanie...</div>;
  }

  if (status !== "authenticated" || (session?.user as { role?: string })?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">Panel Administracyjny</h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-blue-600 hover:underline"
          >
            Wróć do dashboardu
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
          {TABS.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <button
                key={tab.id}
                onClick={() => router.push(tab.href)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {children}
      </div>
    </div>
  );
}
