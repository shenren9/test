import { pool } from "@/lib/db";
import SettingsClient from "./SettingsClient";
import { requireSession } from "@/lib/require-session";

export default async function Settings() {
    const session = await requireSession("/settings");
    if (session.user.admin) {
        return <SettingsClient usersToApprove={await getUsersToApprove(session?.user?.id || "")} />;
    }
    return <SettingsClient usersToApprove={[]} />;
}

async function getUsersToApprove(selfId: string) {
    const result = await pool.query('SELECT * FROM "user" WHERE id != $1 ORDER BY approved ASC, admin DESC', [selfId]);
    return result.rows.map((row) => ({ email: row.email, id: row.id, admin: row.admin, approved: row.approved }));
}