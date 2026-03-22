"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { APIError } from "better-auth/api";

export async function resetPassword(formData: FormData)
{
    const token = formData.get("token") as string;
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (!token)
    {
        redirect("/reset-password?error=" + encodeURIComponent("Missing reset token"));
    }

    if (!password)
    {
        redirect("/reset-password?token=" + encodeURIComponent(token) + "&error=" + encodeURIComponent("Password is required"));
    }

    if (password !== confirm)
    {
        redirect("/reset-password?token=" + encodeURIComponent(token) + "&error=" + encodeURIComponent("Passwords do not match"));
    }

    try
    {
        await auth.api.resetPassword({ body: { token, newPassword: password }, headers: await headers() });
    } catch (e)
    {
        const msg = e instanceof APIError ? e.message : "Failed to reset password";
        redirect("/reset-password?token=" + encodeURIComponent(token) + "&error=" + encodeURIComponent(msg));
    }

    redirect("/login?message=" + encodeURIComponent("Password reset successful. Please sign in."));
}