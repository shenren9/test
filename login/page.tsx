import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { signIn, signUp } from "./actions";
import LoginCard from "./LoginCard";

export default async function LoginPage({
                                            searchParams,
                                        }: {
    searchParams: Promise<{ error?: string; message?: string; mode?: string; next?: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    const params = await searchParams;

    const next = params?.next ?? "/";
    const safeNext = next.startsWith("/login") ? "/" : next;

    // Already logged in -> go to dashboard/next immediately
    if (session) {
        redirect(safeNext);
    }

    const isSignUp = params?.mode === "signup";
    const error = params?.error;
    const message = params?.message;

    return (
        <LoginCard
            isSignUp={isSignUp}
            error={error}
            message={message}
            next={safeNext}
            signInAction={signIn}
            signUpAction={signUp}
        />
    );
}
