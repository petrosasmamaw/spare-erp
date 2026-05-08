"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp, useSession } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isPending && session) {
      router.replace("/dashboard");
    }
  }, [isPending, session, router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const { error: signUpError } = await signUp.email({
      email,
      password,
      name,
      callbackURL: "/dashboard",
    });

    if (!signUpError) {
      router.push("/dashboard");
    } else {
      setError(signUpError.message || "Sign up failed");
    }
  };

  return (
    <div className="max-w-md mx-auto py-16">
      <h1 className="text-2xl font-bold mb-4">Register</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input className="input w-full" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input w-full" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input w-full" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? <div className="text-red-600">{error}</div> : null}
        <button className="btn btn-primary" type="submit">Create account</button>
        <p className="text-sm text-slate-600">
          Already have an account? <Link className="text-cyan-700 underline" href="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
