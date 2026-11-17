import UserSession from "@/components/user-session";

export default function SessionPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <UserSession />
      </div>
    </main>
  );
}