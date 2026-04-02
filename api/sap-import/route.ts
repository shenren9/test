import { NextResponse } from "next/server";
import { parse } from "csv-parse";
import { pool } from "@/lib/db";
import { Readable } from "node:stream";
import * as XLSX from "xlsx";
import { auth } from "@/lib/auth";

export const runtime = "nodejs"; // pg + node streams require Node runtime


export async function POST(req: Request) {

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    try {
        const form = await req.formData();
        const file = form.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
        }

        // Backend safety

        const name = file.name.toLowerCase();
        const isCsv = name.endsWith(".csv");
        const isXlsx = name.endsWith(".xlsx");

        if (!isCsv && !isXlsx) {
            return NextResponse.json(
                { ok: false, error: "Only .csv or .xlsx files are allowed" },
                { status: 400 }
            );
        }

        const positiveAlertsRes = await pool.query(`
            SELECT p.id, p.kind, p.fail_timestamp, p.created_at, p.description, m.name AS machine_name
            FROM predictions p
            JOIN machines m ON m.id = p.machine_id
            WHERE p.verification_status = TRUE
        `);

        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // Notification becomes id
            const upsertSql = `INSERT INTO sap (id, data)
                                VALUES ($1, $2::jsonb)
                                ON CONFLICT (id) DO UPDATE
                                SET data = EXCLUDED.data
                                RETURNING (xmax = 0) AS inserted; 
                               `;

            const handleRow = async (row: Record<string, any>) => {
                const id = String(row["Notification"] ?? "").trim();
                if (!id) {
                    skipped++;
                    return;
                }

                const r = await client.query(upsertSql, [id, JSON.stringify(row)]);
                const wasInserted = Boolean(r.rows?.[0]?.inserted);
                if (wasInserted) inserted++;
                else updated++;
            };

            if (isCsv) {
                const nodeStream = Readable.fromWeb(file.stream() as any);

                const parser = parse({
                    columns: (headers: any[]) => headers.map((h) => String(h).trim()),
                    skip_empty_lines: true,
                    trim: true,
                });

                const csvStream = nodeStream.pipe(parser);

                for await (const row of csvStream as AsyncIterable<Record<string, any>>) {
                    await handleRow(row);
                }
            } else {
                const buf = Buffer.from(await file.arrayBuffer());
                const wb = XLSX.read(buf, { type: "buffer" });

                const sheetName = wb.SheetNames[0];
                if (!sheetName) {
                    return NextResponse.json({ ok: false, error: "No sheets found in XLSX" }, { status: 400 });
                }

                const ws = wb.Sheets[sheetName];

                const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
                    defval: "",
                    raw: false,
                });

                for (const row of rows) {
                    await handleRow(row);
                }
            }

            for (const alert of positiveAlertsRes.rows) {
                await handleRow({
                    "Notification": `ALERT-${alert.id}`,
                    "Functional Location": alert.machine_name,
                    "Description": alert.description,
                    "Basic start date": new Date(alert.fail_timestamp).toISOString().slice(0, 10),
                    "Basic start time": new Date(alert.fail_timestamp).toTimeString().slice(0, 8),
                    "Order Type": alert.kind,
                    "Created on": new Date(alert.created_at).toISOString().slice(0, 10),
                });
            }

            await client.query("NOTIFY new_sap_data");
            await client.query("COMMIT");
        } catch (e) {
            await client.query("ROLLBACK");
            throw e;
        } finally {
            client.release();
        }

        return NextResponse.json({
            ok: true,
            inserted,
            updated,
            skipped,
        });
    } catch (err) {
        console.error("sap-import failed:", err);
        return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
    }
}