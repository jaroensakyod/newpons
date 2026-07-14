"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    if (loading) return;
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="rounded-lg px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
    >
      ออกจากระบบ
    </button>
  );
}
