import { pool } from "@/lib/db";
import SettingsClient from "./SettingsClient";
import { requireSession } from "@/lib/require-session";
import { getMachineList } from "@/lib/frontendData";

export default async function Settings() {
    const session = await requireSession("/settings");
    const { machines } = await getMachineList();
    if (session.user.admin) {
        return (
            <SettingsClient
                usersToApprove={await getUsersToApprove(session?.user?.id || "")}
                machines={machines}
                isAdmin
            />
        );
    }
    return <SettingsClient usersToApprove={[]} isAdmin={false} machines={machines} />;
}

async function getUsersToApprove(selfId: string) {
    const result = await pool.query('SELECT * FROM "user" WHERE id != $1 ORDER BY approved ASC, admin DESC', [selfId]);
    return result.rows.map((row) => ({ email: row.email, id: row.id, admin: row.admin, approved: row.approved }));
}