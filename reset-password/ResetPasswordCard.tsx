"use client";

import Link from "next/link";
import { useState } from "react";
import { resetPassword } from "./actions";

export default function ResetPasswordCard({ token, error, message }:
                                          { token?: string; error?: string; message?: string })
{
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="rpPage">
            <div className="rpTopBar">
                <h1 className="rpBrand">AkzoNobel</h1>
            </div>

            <div className="rpWrap">
                <div className="rpCard">
                    <div className="rpTitle">Set New Password</div>
                    <div className="rpSubtitle">Enter your new password below.</div>

                    {error && <div className="rpError">{decodeURIComponent(error)}</div>}
                    {message && <div className="rpMessage">{decodeURIComponent(message)}</div>}

                    {!token ? (
                        <>
                            <div className="rpError">Missing token. Use the link from your email.</div>
                            <div className="rpLinks">
                                <Link href="/forgot-password">Request a new link</Link>
                            </div>
                        </>
                    ) : (
                        <form action={resetPassword} className="rpForm">
                            <input type="hidden" name="token" value={token} />

                            <label className="rpLabel" htmlFor="rp-password">New Password</label>
                            <div className="passwordRow">
                                <input
                                    className="rpInput passwordInput"
                                    id="rp-password"
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

                            <label className="rpLabel" htmlFor="rp-confirm">Confirm Password</label>
                            <input
                                className="rpInput"
                                id="rp-confirm"
                                name="confirm"
                                type={showPassword ? "text" : "password"}
                                required
                            />

                            <button className="rpBtn" type="submit">Update Password</button>

                            <div className="rpLinks">
                                <Link href="/login">Back to login</Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}