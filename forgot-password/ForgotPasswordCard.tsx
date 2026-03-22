"use client";

import Link from "next/link";
import { requestPasswordReset } from "./actions";

export default function ForgotPasswordCard({ error, message }:
                                           { error?: string; message?: string })
{
    return (
        <div className="fpPage">
            <div className="fpTopBar">
                <h1 className="fpBrand">AkzoNobel</h1>
            </div>

            <div className="fpWrap">
                <div className="fpCard">
                    <div className="fpTitle">Reset Password</div>
                    <div className="fpSubtitle">
                        Enter your email and we’ll send a reset link.
                    </div>

                    {error && <div className="fpError">{decodeURIComponent(error)}</div>}
                    {message && <div className="fpMessage">{decodeURIComponent(message)}</div>}

                    <form action={requestPasswordReset} className="fpForm">
                        <label className="fpLabel" htmlFor="fp-email">Email Address</label>
                        <input
                            className="fpInput"
                            id="fp-email"
                            name="email"
                            type="email"
                            required
                            placeholder="AkzoNobelEmployee"
                        />

                        <button className="fpBtn" type="submit">Send Reset Link</button>

                        <div className="fpLinks">
                            <Link href="/login">Back to login</Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}