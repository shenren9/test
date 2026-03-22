import ResetPasswordCard from "./ResetPasswordCard";
import "./reset-password.css";

export default async function ResetPasswordPage({ searchParams }:
                                                { searchParams: Promise<{ token?: string; error?: string; message?: string }> })
{
    const params = await searchParams;

    return (
        <ResetPasswordCard
            token={params?.token}
            error={params?.error}
            message={params?.message}
        />
    );
}