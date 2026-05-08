"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, useSession } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isPending && session) {
      router.replace("/dashboard");
    }
  }, [isPending, session, router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const { error: signInError } = await signIn.email({
      email,
      password,
      callbackURL: "/dashboard",
    });

    if (!signInError) {
      router.push("/dashboard");
    } else {
      setError(signInError.message || "Sign in failed");
    }
  };

  return (
    <div className="max-w-md mx-auto py-16">
      <h1 className="text-2xl font-bold mb-4">Sign in</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input className="input w-full" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input w-full" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? <div className="text-red-600">{error}</div> : null}
        <button className="btn btn-primary" type="submit">Sign in</button>
        <p className="text-sm text-slate-600">
          No account? <Link className="text-cyan-700 underline" href="/register">Create one</Link>
        </p>
      </form>
    </div>
  );
}
