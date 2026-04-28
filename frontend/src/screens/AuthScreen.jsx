import { useState } from "react";
import { useAuth } from "../auth/AuthContext";

export default function AuthScreen() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isLogin = mode === "login";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isLogin) {
        await login({ identifier, password });
      } else {
        await signup({ username, email, password });
      }
    } catch (err) {
      setError(err?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand" style={{ justifyContent: "center", marginBottom: 12 }}>
          <span className="brand-icon">⚔</span>
          <strong>PokeChallenge</strong>
        </div>

        <h2 style={{ marginTop: 0, textAlign: "center" }}>
          {isLogin ? "Sign in" : "Create your account"}
        </h2>
        <p className="muted small" style={{ textAlign: "center", marginTop: 0 }}>
          {isLogin
            ? "Welcome back, trainer."
            : "Start tracking your runs."}
        </p>

        <form onSubmit={handleSubmit} className="stack">
          {isLogin ? (
            <label>
              Username or Email
              <input
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </label>
          ) : (
            <>
              <label>
                Username
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={50}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
            </>
          )}

          <label>
            Password
            <input
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isLogin ? 1 : 8}
            />
          </label>

          {error && (
            <div className="muted small" style={{ color: "#f87171" }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn primary" disabled={submitting}>
            {submitting ? "…" : isLogin ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="muted small" style={{ marginTop: 12, textAlign: "center" }}>
          {isLogin ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="ghost small"
            onClick={() => {
              setError(null);
              setMode(isLogin ? "signup" : "login");
            }}
          >
            {isLogin ? "Create an account" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
