"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Lock, Mail, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("from") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError(result.error);
        toast.error("Login failed: " + result.error);
      } else {
        toast.success("Welcome back!");
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/40 via-gray-50 to-gray-50 px-4 font-sans">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-6">
            <Image
              src="/chadwick-logo.svg"
              alt="Chadwick Logo"
              width={200}
              height={60}
              className="h-16 w-auto"
              priority
            />
          </div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-100 mb-4">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Enterprise Quoting</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Q2C Portal</h1>
          <p className="text-gray-500 mt-2 font-medium">Management & Estimating System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-gray-200 p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1" htmlFor="email">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                  placeholder="name@chadwick.com.au"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1" htmlFor="password">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign Into Portal"
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-50 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">
              Secure Estimating Environment
            </p>
          </div>
        </div>
        
        <div className="mt-10 flex flex-col items-center gap-4">
          <p className="text-gray-400 text-xs font-medium">
            &copy; {new Date().getFullYear()} Chadwick Switchboards. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
