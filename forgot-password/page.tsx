import ForgotPasswordCard from "./ForgotPasswordCard";
import "./forgot-password.css";

export default async function ForgotPasswordPage({ searchParams }:
                                                 { searchParams: Promise<{ error?: string; message?: string }> })
{
    const params = await searchParams;

    return <ForgotPasswordCard error={params?.error} message={params?.message} />;
}