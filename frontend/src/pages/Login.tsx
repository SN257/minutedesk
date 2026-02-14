import { useState, useEffect } from "react";
import { login } from "../services/api";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "../contexts/SnackbarContext";
import { useAuth } from "../contexts/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const { refreshUser, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "MinuteDesk - Login";
  }, []);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      showSnackbar("Email and password are required", "error");
      return;
    }

    setLoading(true);

    try {
      await login({ email, password });
      await refreshUser(); // Refresh the auth context
      showSnackbar("Login successful!", "success");
      navigate("/dashboard", { replace: true }); // Replace history instead of push
    } catch (err: any) {
      showSnackbar(err.message || "Login failed. Please check your credentials.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Logo and Title Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-800 rounded-2xl mb-4 shadow-lg shadow-slate-300">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          MinuteDesk
        </h1>
        <p className="text-sm text-slate-500">
          Streamline your one-to-one meetings
        </p>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-md mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-7">
        <h2 className="text-xl font-semibold text-slate-800 mb-6">
          Sign in to your account
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 pr-11 text-slate-800 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />

              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setShowPassword((s) => !s); }}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                aria-disabled={loading || password.length === 0}
                disabled={loading || password.length === 0}
                className={
                  "absolute right-2 top-1/2 -translate-y-1/2 p-2 focus:outline-none " +
                  (loading || password.length === 0
                    ? "text-slate-300 cursor-not-allowed"
                    : "text-slate-500 hover:text-slate-700")
                }
              >
                {showPassword ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M10.58 10.58A3 3 0 0113.42 13.42" />
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9.88 5.11A9 9 0 0121 12c-1.274 4.057-5.065 7-9.542 7-1.64 0-3.174-.37-4.52-1.02" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <div className="mt-2 text-right">
              <a
                href="#"
                className="text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                onClick={(e) => e.preventDefault()}
              >
                Forgot password?
              </a>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-900 active:bg-slate-900 text-white py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-slate-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-800"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-xs text-slate-500 text-center mt-6">
        Authorized users only • Protected by security protocols
      </p>
    </>
  );
};

export default Login;