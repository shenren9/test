"use client";

import Link from "next/link";
import { useState } from "react";

import "./login.css";

export default function LoginCard({ isSignUp, error, message, next, signInAction, signUpAction }:
                                  { isSignUp: boolean; error?: string; message?: string; next: string;
                                      signInAction: (formData: FormData) => Promise<void>;
                                      signUpAction: (formData: FormData) => Promise<void> })
{

    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="loginPage">
            <div className="loginTopBar">
                <h1 className="loginBrand">AkzoNobel</h1>
            </div>

            <div className="loginWrap">
                <div className="loginCard">
                    <div className="loginTitle">Welcome Back</div>
                    <div className="loginSubtitle">Please sign in to continue</div>

                    {error && <div className="loginError">{decodeURIComponent(error)}</div>}
                    {message && <div className="loginMessage">{decodeURIComponent(message)}</div>}

                    {isSignUp ? (
                        <form action={signUpAction} className="loginForm">
                            <input type="hidden" name="next" value={next} />

                            <label className="loginLabel" htmlFor="name">Name</label>
                            <input className="loginInput" id="name" name="name" type="text" required />

                            <label className="loginLabel" htmlFor="signup-email">Email Address</label>
                            <input
                                className="loginInput"
                                id="signup-email"
                                name="email"
                                type="email"
                                required
                                placeholder="AkzoNobelEmployee"
                            />

                            <label className="loginLabel" htmlFor="signup-password">Password</label>
                            <div className="passwordRow">
                                <input
                                    className="loginInput passwordInput"
                                    id="signup-password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                />
                                <button
                                    type="button"
                                    className="eyeBtn"
                                    onClick={() => setShowPassword((v) => !v)}
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>

                            <button className="loginBtn" type="submit">Sign Up</button>

                            <div className="loginLinks">
                                <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in instead</Link>
                            </div>
                        </form>
                    ) : (
                        <form action={signInAction} className="loginForm">
                            <input type="hidden" name="next" value={next} />

                            <label className="loginLabel" htmlFor="login-email">Email Address</label>
                            <input
                                className="loginInput"
                                id="login-email"
                                name="email"
                                type="email"
                                required
                                placeholder="AkzoNobelEmployee"
                            />

                            <label className="loginLabel" htmlFor="login-password">Password</label>
                            <div className="passwordRow">
                                <input
                                    className="loginInput passwordInput"
                                    id="login-password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                />
                                <button
                                    type="button"
                                    className="eyeBtn"
                                    onClick={() => setShowPassword((v) => !v)}
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>

                            <button className="loginBtn" type="submit">Sign In</button>

                            <div className="loginLinks">
                                <Link href={`/login?mode=signup&next=${encodeURIComponent(next)}`}>Create An Account</Link>
                                <Link href="/forgot-password" className="muted">Forgot password?</Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
