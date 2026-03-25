import { pool } from "@/lib/db";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

const ROW_LIMIT = 10000;

function escapeCsv(value: string) {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
}

export async function GET(req: Request) {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    if (!startDate || !endDate) {
        return new Response(JSON.stringify({ error: "startDate and endDate are required" }), { status: 400 });
    }

    const minCertainty = url.searchParams.get("minCertainty");
    const maxCertainty = url.searchParams.get("maxCertainty");
    const machineIds = url.searchParams.get("machineIds");
    const kinds = url.searchParams.get("kinds");
    const completed = url.searchParams.get("completed");
    const verified = url.searchParams.get("verified");
    const format = url.searchParams.get("format") || "csv";

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    conditions.push(`p.created_at >= $${paramIndex}`);
    params.push(startDate);
    paramIndex++;

    conditions.push(`p.created_at <= $${paramIndex}::date + INTERVAL '1 day'`);
    params.push(endDate);
    paramIndex++;

    if (minCertainty) {
        conditions.push(`p.certainty >= $${paramIndex}`);
        params.push(parseFloat(minCertainty) / 100);
        paramIndex++;
    }
    if (maxCertainty) {
        conditions.push(`p.certainty <= $${paramIndex}`);
        params.push(parseFloat(maxCertainty) / 100);
        paramIndex++;
    }
    if (machineIds) {
        const ids = machineIds.split(",").map(id => id.trim());
        conditions.push(`p.machine_id = ANY($${paramIndex})`);
        params.push(ids);
        paramIndex++;
    }
    if (kinds) {
        const kindList = kinds.split(",").map(k => k.trim());
        conditions.push(`p.kind = ANY($${paramIndex})`);
        params.push(kindList);
        paramIndex++;
    }
    if (completed === "true") {
        conditions.push(`p.completed = true`);
    } else if (completed === "false") {
        conditions.push(`(p.completed = false OR p.completed IS NULL)`);
    }
    if (verified === "true") {
        conditions.push(`p.verification_status = true`);
    } else if (verified === "false") {
        conditions.push(`p.verification_status = false`);
    } else if (verified === "null") {
        conditions.push(`p.verification_status IS NULL`);
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    try {
        const result = await pool.query(
            `SELECT
                p.id,
                m.name AS machine_name,
                p.kind,
                p.certainty,
                p.description,
                p.fail_timestamp,
                p.created_at,
                p.verification_status,
                p.completed
            FROM predictions p
            JOIN machines m ON p.machine_id = m.id
            ${whereClause}
            ORDER BY p.created_at DESC
            LIMIT ${ROW_LIMIT}`,
            params
        );

        const predictionIds = result.rows.map(r => r.id);
        const assigneeMap: Record<string, string[]> = {};

        if (predictionIds.length > 0) {
            const assignments = await pool.query(
                `SELECT pa.prediction_id::text AS prediction_id, u.email
                FROM prediction_assignments pa
                JOIN "user" u ON pa.user_id = u.id
                WHERE pa.prediction_id = ANY($1)`,
                [predictionIds]
            );
            for (const row of assignments.rows) {
                if (!assigneeMap[row.prediction_id]) assigneeMap[row.prediction_id] = [];
                assigneeMap[row.prediction_id].push(row.email);
            }
        }

        const headers = [
            "Alert ID", "Machine Name", "Kind", "Certainty (%)", "Description",
            "Estimated Failure Date", "Created At", "Verification Status",
            "Assigned To", "Completed"
        ];

        const formattedRows = result.rows.map(row => {
            let verificationLabel = "Unverified";
            if (row.verification_status === true) verificationLabel = "Confirmed";
            else if (row.verification_status === false) verificationLabel = "Rejected";

            const assignees = assigneeMap[row.id] || [];

            return [
                String(row.id),
                row.machine_name || "",
                row.kind || "",
                row.certainty != null ? (row.certainty * 100).toFixed(1) : "",
                row.description || "",
                row.fail_timestamp ? new Date(row.fail_timestamp).toISOString().split("T")[0] : "",
                row.created_at ? new Date(row.created_at).toISOString().replace("T", " ").slice(0, 19) : "",
                verificationLabel,
                assignees.join("; "),
                row.completed ? "Yes" : "No",
            ];
        });

        const today = new Date().toISOString().split("T")[0];

        if (format === "json") {
            const jsonRows = formattedRows.map(row => {
                const obj: Record<string, string> = {};
                headers.forEach((h, i) => { obj[h] = row[i]; });
                return obj;
            });
            return new Response(JSON.stringify(jsonRows), {
                headers: { "Content-Type": "application/json" },
            });
        }

        const csvRows = formattedRows.map(row => row.map(escapeCsv).join(","));
        const csv = [headers.join(","), ...csvRows].join("\n");

        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="alerts-export-${today}.csv"`,
            },
        });
    } catch (err) {
        console.error("export-alerts failed:", err);
        return new Response(JSON.stringify({ error: "Export failed" }), { status: 500 });
    }
}
