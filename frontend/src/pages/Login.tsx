import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login as apiLogin } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [mounted, setMounted] = useState(false);
    const navigate = useNavigate();
    const { setUser } = useAuth();

    useEffect(() => {
        // Trigger mount animations
        const timer = setTimeout(() => setMounted(true), 50);
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const loggedInUser = await apiLogin({ email, password });
            // Set user directly from login response to avoid cross-site cookie issues
            setUser(loggedInUser);
            navigate("/");
        } catch (err: any) {
            setError(err.message || "Invalid credentials. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="login-root">
                {/* ─── LEFT PANEL: Brand Showcase ─── */}
                <div className="login-brand-panel">
                    {/* Animated gradient orbs */}
                    <div className="brand-orb brand-orb-1" />
                    <div className="brand-orb brand-orb-2" />
                    <div className="brand-orb brand-orb-3" />

                    {/* Grid texture overlay */}
                    <div className="brand-grid-overlay" />

                    <div className={`brand-content ${mounted ? 'brand-content--visible' : ''}`}>
                        {/* Logo */}
                        <div className="brand-logo-row">
                            <div className="brand-logo-mark">
                                <svg className="brand-logo-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="brand-logo-text">MinuteDesk</span>
                        </div>

                        {/* Hero text */}
                        <h1 className="brand-hero-title">
                            Elevate Your Team's
                            <span className="brand-hero-highlight">Productivity</span>
                        </h1>
                        <p className="brand-hero-subtitle">
                            The all-in-one workspace that brings meetings, tasks, and insights together — so your team can focus on what matters.
                        </p>

                        {/* Feature pills */}
                        <div className="brand-features">
                            {[
                                { icon: "M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z", label: "Bank-Level Security" },
                                { icon: "M13 10V3L4 14h7v7l9-11h-7z", label: "Lightning Fast" },
                                { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", label: "Enterprise Ready" },
                            ].map((f) => (
                                <div key={f.label} className="brand-feature-pill">
                                    <svg className="brand-feature-icon" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d={f.icon} clipRule="evenodd" />
                                    </svg>
                                    <span>{f.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Trust badge */}
                        <div className="brand-trust">
                            <div className="brand-trust-avatars">
                                {['S', 'A', 'M', 'R'].map((letter, i) => (
                                    <div key={letter} className="brand-trust-avatar" style={{ zIndex: 4 - i }}>
                                        {letter}
                                    </div>
                                ))}
                            </div>
                            <span className="brand-trust-text">Trusted by <strong>10,000+</strong> teams worldwide</span>
                        </div>
                    </div>
                </div>

                {/* ─── RIGHT PANEL: Login Form ─── */}
                <div className="login-form-panel">
                    {/* Subtle background orbs */}
                    <div className="form-panel-orb form-panel-orb-1" />
                    <div className="form-panel-orb form-panel-orb-2" />

                    <div className={`login-form-container ${mounted ? 'login-form-container--visible' : ''}`}>
                        {/* Mobile-only logo */}
                        <div className="login-mobile-logo">
                            <div className="brand-logo-mark brand-logo-mark--small">
                                <svg className="brand-logo-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="brand-logo-text brand-logo-text--dark">MinuteDesk</span>
                        </div>

                        {/* Form header */}
                        <div className="login-form-header">
                            <h2 className="login-form-title">Welcome back</h2>
                            <p className="login-form-subtitle">Sign in to your workspace to continue</p>
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="login-error" role="alert">
                                <svg className="login-error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="login-form" autoComplete="on">
                            <div className="login-field">
                                <label htmlFor="login-email" className="login-label">Email Address</label>
                                <div className="login-input-wrapper">
                                    <svg className="login-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <input
                                        id="login-email"
                                        type="email"
                                        placeholder="you@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoFocus
                                        autoComplete="email"
                                        className="login-input"
                                    />
                                </div>
                            </div>

                            <div className="login-field">
                                <label htmlFor="login-password" className="login-label">Password</label>
                                <div className="login-input-wrapper">
                                    <svg className="login-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <input
                                        id="login-password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                        className="login-input login-input--password"
                                    />
                                    <button
                                        type="button"
                                        className="login-password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? (
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="login-toggle-icon">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878l4.242 4.242M21 21l-4.878-4.878" />
                                            </svg>
                                        ) : (
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="login-toggle-icon">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="login-submit-btn"
                                disabled={loading}
                                id="login-submit"
                            >
                                {loading ? (
                                    <span className="login-btn-loading">
                                        <svg className="login-spinner" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
                                        </svg>
                                        Signing in...
                                    </span>
                                ) : (
                                    <span className="login-btn-content">
                                        Sign In
                                        <svg className="login-btn-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </span>
                                )}
                            </button>
                        </form>

                        {/* Footer */}
                        <p className="login-footer-text">
                            By signing in, you agree to our{" "}
                            <a href="#" className="login-footer-link">Terms of Service</a>{" "}
                            and{" "}
                            <a href="#" className="login-footer-link">Privacy Policy</a>.
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
                /* ============================== */
                /* ROOT LAYOUT                    */
                /* ============================== */
                .login-root {
                    display: flex;
                    min-height: 100vh;
                    width: 100%;
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    background: #f8fafc;
                }

                /* ============================== */
                /* LEFT BRAND PANEL               */
                /* ============================== */
                .login-brand-panel {
                    display: none;
                    position: relative;
                    flex: 1;
                    background: #0f172a;
                    overflow: hidden;
                }

                @media (min-width: 1024px) {
                    .login-brand-panel {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        max-width: 55%;
                    }
                }

                /* Animated orbs */
                .brand-orb {
                    position: absolute;
                    border-radius: 50%;
                    pointer-events: none;
                    filter: blur(100px);
                    will-change: transform;
                }
                .brand-orb-1 {
                    width: 500px; height: 500px;
                    top: -15%; left: -10%;
                    background: radial-gradient(circle, rgba(99,102,241,0.25), transparent 70%);
                    animation: orb-drift-1 14s ease-in-out infinite;
                }
                .brand-orb-2 {
                    width: 400px; height: 400px;
                    bottom: -10%; right: -10%;
                    background: radial-gradient(circle, rgba(79,70,229,0.2), transparent 70%);
                    animation: orb-drift-2 18s ease-in-out infinite;
                }
                .brand-orb-3 {
                    width: 300px; height: 300px;
                    top: 30%; right: 20%;
                    background: radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%);
                    animation: orb-drift-3 12s ease-in-out infinite;
                }
                @keyframes orb-drift-1 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(40px, -30px) scale(1.08); }
                    66% { transform: translate(-20px, 20px) scale(0.95); }
                }
                @keyframes orb-drift-2 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(-50px, -40px) scale(1.1); }
                }
                @keyframes orb-drift-3 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(30px, 30px) scale(1.12); }
                }

                /* Grid overlay */
                .brand-grid-overlay {
                    position: absolute;
                    inset: 0;
                    background-image:
                        linear-gradient(rgba(148,163,184,0.04) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(148,163,184,0.04) 1px, transparent 1px);
                    background-size: 60px 60px;
                    pointer-events: none;
                }

                /* Brand content */
                .brand-content {
                    position: relative;
                    z-index: 10;
                    padding: 3.5rem;
                    max-width: 560px;
                    opacity: 0;
                    transform: translateY(24px);
                    transition: opacity 0.7s cubic-bezier(.16,1,.3,1), transform 0.7s cubic-bezier(.16,1,.3,1);
                }
                .brand-content--visible {
                    opacity: 1;
                    transform: translateY(0);
                }

                /* Logo row */
                .brand-logo-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 2.5rem;
                }
                .brand-logo-mark {
                    width: 44px; height: 44px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #334155, #1e293b);
                    border: 1px solid rgba(255,255,255,0.12);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                    flex-shrink: 0;
                }
                .brand-logo-mark--small {
                    width: 36px; height: 36px;
                    border-radius: 10px;
                    background: linear-gradient(135deg, #0f172a, #1e293b);
                    border: 1px solid rgba(15,23,42,0.15);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .brand-logo-icon {
                    width: 20px; height: 20px;
                    color: white;
                }
                .brand-logo-text {
                    font-size: 1.35rem;
                    font-weight: 800;
                    color: white;
                    letter-spacing: -0.02em;
                }
                .brand-logo-text--dark {
                    color: #0f172a;
                }

                /* Hero */
                .brand-hero-title {
                    font-size: 2.75rem;
                    font-weight: 900;
                    color: white;
                    line-height: 1.1;
                    letter-spacing: -0.03em;
                    margin-bottom: 1.25rem;
                }
                .brand-hero-highlight {
                    display: block;
                    margin-top: 0.35rem;
                    background: linear-gradient(135deg, #94a3b8, #e2e8f0);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                .brand-hero-subtitle {
                    font-size: 1.05rem;
                    color: #94a3b8;
                    line-height: 1.7;
                    margin-bottom: 2rem;
                    font-weight: 400;
                }

                /* Feature pills */
                .brand-features {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin-bottom: 2.5rem;
                }
                .brand-feature-pill {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 16px;
                    border-radius: 100px;
                    background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(255,255,255,0.08);
                    color: #cbd5e1;
                    font-size: 0.8rem;
                    font-weight: 600;
                    transition: all 0.25s ease;
                }
                .brand-feature-pill:hover {
                    background: rgba(255,255,255,0.1);
                    border-color: rgba(255,255,255,0.15);
                }
                .brand-feature-icon {
                    width: 14px; height: 14px;
                    opacity: 0.7;
                }

                /* Trust */
                .brand-trust {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }
                .brand-trust-avatars {
                    display: flex;
                }
                .brand-trust-avatar {
                    width: 32px; height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: white;
                    border: 2px solid #0f172a;
                    margin-left: -8px;
                }
                .brand-trust-avatar:first-child { margin-left: 0; }
                .brand-trust-avatar:nth-child(1) { background: #475569; }
                .brand-trust-avatar:nth-child(2) { background: #334155; }
                .brand-trust-avatar:nth-child(3) { background: #64748b; }
                .brand-trust-avatar:nth-child(4) { background: #1e293b; }
                .brand-trust-text {
                    font-size: 0.82rem;
                    color: #64748b;
                }
                .brand-trust-text strong {
                    color: #94a3b8;
                }

                /* ============================== */
                /* RIGHT FORM PANEL               */
                /* ============================== */
                .login-form-panel {
                    position: relative;
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem 1.5rem;
                    background: #f8fafc;
                    overflow: hidden;
                }

                @media (min-width: 1024px) {
                    .login-form-panel {
                        min-width: 45%;
                        padding: 3rem;
                    }
                }

                /* Subtle panel orbs */
                .form-panel-orb {
                    position: absolute;
                    border-radius: 50%;
                    pointer-events: none;
                    filter: blur(90px);
                    opacity: 0.5;
                }
                .form-panel-orb-1 {
                    width: 300px; height: 300px;
                    top: -10%; right: -10%;
                    background: radial-gradient(circle, rgba(148,163,184,0.15), transparent 70%);
                    animation: orb-drift-1 16s ease-in-out infinite;
                }
                .form-panel-orb-2 {
                    width: 250px; height: 250px;
                    bottom: -10%; left: -10%;
                    background: radial-gradient(circle, rgba(203,213,225,0.2), transparent 70%);
                    animation: orb-drift-2 20s ease-in-out infinite;
                }

                /* Form container */
                .login-form-container {
                    position: relative;
                    z-index: 10;
                    width: 100%;
                    max-width: 420px;
                    opacity: 0;
                    transform: translateY(20px);
                    transition: opacity 0.6s cubic-bezier(.16,1,.3,1) 0.15s, transform 0.6s cubic-bezier(.16,1,.3,1) 0.15s;
                }
                .login-form-container--visible {
                    opacity: 1;
                    transform: translateY(0);
                }

                /* Mobile logo */
                .login-mobile-logo {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 2.5rem;
                }
                @media (min-width: 1024px) {
                    .login-mobile-logo { display: none; }
                }

                /* Form header */
                .login-form-header {
                    margin-bottom: 2rem;
                }
                .login-form-title {
                    font-size: 1.85rem;
                    font-weight: 800;
                    color: #0f172a;
                    letter-spacing: -0.025em;
                    margin: 0 0 0.4rem;
                }
                .login-form-subtitle {
                    font-size: 0.95rem;
                    color: #64748b;
                    font-weight: 400;
                    margin: 0;
                }

                /* Error */
                .login-error {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 16px;
                    border-radius: 12px;
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    color: #dc2626;
                    font-size: 0.85rem;
                    font-weight: 500;
                    margin-bottom: 1.5rem;
                    animation: shake 0.4s ease-in-out;
                }
                .login-error-icon {
                    width: 18px; height: 18px;
                    flex-shrink: 0;
                    color: #ef4444;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-6px); }
                    40% { transform: translateX(6px); }
                    60% { transform: translateX(-4px); }
                    80% { transform: translateX(4px); }
                }

                /* Form */
                .login-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.35rem;
                }

                .login-field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .login-label {
                    font-size: 0.82rem;
                    font-weight: 600;
                    color: #334155;
                    letter-spacing: 0.01em;
                }

                .login-input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .login-input-icon {
                    position: absolute;
                    left: 14px;
                    width: 18px; height: 18px;
                    color: #94a3b8;
                    pointer-events: none;
                    transition: color 0.2s ease;
                }
                .login-input-wrapper:focus-within .login-input-icon {
                    color: #475569;
                }

                .login-input {
                    width: 100%;
                    padding: 13px 14px 13px 44px;
                    border-radius: 12px;
                    border: 1.5px solid #e2e8f0;
                    background: white;
                    font-size: 0.92rem;
                    font-weight: 500;
                    color: #0f172a;
                    outline: none;
                    transition: all 0.25s cubic-bezier(.16,1,.3,1);
                    font-family: inherit;
                    box-sizing: border-box;
                }
                .login-input::placeholder {
                    color: #94a3b8;
                    font-weight: 400;
                }
                .login-input:hover {
                    border-color: #cbd5e1;
                }
                .login-input:focus {
                    border-color: #475569;
                    box-shadow: 0 0 0 3px rgba(71,85,105,0.08);
                }
                .login-input--password {
                    padding-right: 48px;
                }

                /* Password toggle */
                .login-password-toggle {
                    position: absolute;
                    right: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px; height: 32px;
                    border-radius: 8px;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    color: #94a3b8;
                    transition: all 0.2s ease;
                }
                .login-password-toggle:hover {
                    color: #475569;
                    background: #f1f5f9;
                }
                .login-toggle-icon {
                    width: 18px; height: 18px;
                }

                /* Submit button */
                .login-submit-btn {
                    position: relative;
                    width: 100%;
                    padding: 14px;
                    border-radius: 12px;
                    border: none;
                    background: #0f172a;
                    color: white;
                    font-size: 0.95rem;
                    font-weight: 700;
                    cursor: pointer;
                    overflow: hidden;
                    transition: all 0.3s cubic-bezier(.16,1,.3,1);
                    font-family: inherit;
                    margin-top: 0.5rem;
                }
                .login-submit-btn::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, #1e293b, #334155);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                .login-submit-btn:hover:not(:disabled)::before {
                    opacity: 1;
                }
                .login-submit-btn:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 12px 28px rgba(15,23,42,0.25);
                }
                .login-submit-btn:active:not(:disabled) {
                    transform: translateY(0);
                    box-shadow: 0 4px 12px rgba(15,23,42,0.2);
                }
                .login-submit-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .login-btn-content, .login-btn-loading {
                    position: relative;
                    z-index: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                .login-btn-arrow {
                    width: 18px; height: 18px;
                    transition: transform 0.25s ease;
                }
                .login-submit-btn:hover:not(:disabled) .login-btn-arrow {
                    transform: translateX(4px);
                }

                .login-spinner {
                    width: 20px; height: 20px;
                    animation: spin 0.75s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* Footer */
                .login-footer-text {
                    text-align: center;
                    font-size: 0.78rem;
                    color: #94a3b8;
                    margin-top: 2rem;
                    line-height: 1.5;
                }
                .login-footer-link {
                    color: #475569;
                    text-decoration: none;
                    font-weight: 600;
                    transition: color 0.2s ease;
                }
                .login-footer-link:hover {
                    color: #0f172a;
                    text-decoration: underline;
                }

                /* ============================== */
                /* RESPONSIVE TWEAKS              */
                /* ============================== */
                @media (max-width: 480px) {
                    .login-form-panel {
                        padding: 1.5rem 1.25rem;
                    }
                    .brand-hero-title {
                        font-size: 2rem;
                    }
                    .login-form-title {
                        font-size: 1.5rem;
                    }
                    .login-input {
                        padding: 12px 12px 12px 40px;
                        font-size: 0.88rem;
                    }
                    .login-submit-btn {
                        padding: 13px;
                    }
                }
            `}</style>
        </>
    );
};

export default Login;
