"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { APIError } from "better-auth/api";

export async function requestPasswordReset(formData: FormData)
{
    const email = formData.get("email") as string;

    if (!email)
    {
        redirect("/forgot-password?error=" + encodeURIComponent("Email is required"));
    }

    const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL;

    try
    {
        await auth.api.requestPasswordReset({ body: { email, redirectTo: baseUrl + "/reset-password" },
            headers: await headers() });
    } catch (e)
    {
        const msg = e instanceof APIError ? e.message : "Failed to request password reset";
        redirect("/forgot-password?error=" + encodeURIComponent(msg));
    }

    redirect("/forgot-password?message=" + encodeURIComponent("If an account exists for that email, a reset link was sent."));
}