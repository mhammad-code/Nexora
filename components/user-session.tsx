
"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function UserSession() {
  const router = useRouter();

  const { data: session, isPending } = authClient.useSession();

  async function handleLogout() {
    try {
      await authClient.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  if (isPending) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">
          Checking your session...
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">
          You are not logged in.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">
        Welcome, {session.user.name}!
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        {session.user.email}
      </p>

      <button
        onClick={handleLogout}
        className="mt-6 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
      >
        Logout
      </button>
    </div>
  );
}
