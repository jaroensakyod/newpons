"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-4xl">😵</p>
      <h1 className="mt-3 text-lg font-bold">มีบางอย่างผิดพลาด</h1>
      <p className="mt-2 text-sm text-slate-500">
        {error.message || "ลองใหม่อีกครั้ง ถ้ายังพังให้เช็คการตั้งค่า Supabase"}
      </p>
      <button
        onClick={reset}
        className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700"
      >
        ลองใหม่
      </button>
    </main>
  );
}
