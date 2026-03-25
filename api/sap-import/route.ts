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

                const flRaw = String(row["Functional Location"] ?? "").trim();
                if (flRaw) {
                    await client.query(
                        `INSERT INTO sap_to_sensorfact_mapping (sap_machine_id, sensorfact_machine_id, sensorfact_group_id)
                         VALUES ($1, NULL, NULL)
                         ON CONFLICT (sap_machine_id) DO NOTHING`,
                        [id]
                    );
                }
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