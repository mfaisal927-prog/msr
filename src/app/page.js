"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "./actions";

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const response = await loginUser(new FormData(e.currentTarget));

    if (!response.success) {
      setError(response.error || "Login نہیں ہو سکا۔");
      setIsSubmitting(false);
      return;
    }

    const nextPath = new URLSearchParams(window.location.search).get("next");
    const defaultPath = response.user?.role === "STAFF" ? "/daily-entry" : "/dashboard";
    const safeNextPath = nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : defaultPath;

    router.replace(safeNextPath);
    router.refresh();
  };

  return (
    <div className="container center-content" suppressHydrationWarning>
      <h1 className="brand-title animate-slide-up">
        ملک سجاول<br />ریفریشمنٹ
      </h1>

      <div className="auth-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-main)' }}>لاگ اِن</h2>

        <form onSubmit={handleLogin}>
          <div className="form-group" suppressHydrationWarning>
            <label className="form-label" htmlFor="username">یوزرنیم</label>
            <input
              id="username"
              name="username"
              type="text"
              className="form-input"
              placeholder="یوزرنیم درج کریں"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group" suppressHydrationWarning>
            <label className="form-label" htmlFor="password">پاس ورڈ</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              placeholder="پاس ورڈ درج کریں"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="error-message" style={{ marginBottom: '1rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }} disabled={isSubmitting}>
            {isSubmitting ? "چیک ہو رہا ہے..." : "لاگ اِن"}
          </button>

          {process.env.NODE_ENV !== "production" && (
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem' }}>
              پہلی بار: username <strong>admin</strong> اور password <strong>admin123</strong>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
