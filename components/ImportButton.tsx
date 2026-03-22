"use client";

import { useRef, useState } from "react";

export const ImportButton = () => {
    const inputRef = useRef<HTMLInputElement | null>(null);

    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [uploading, setUploading] = useState(false);

    const openPicker = () => {
        setError("");
        setStatus("");
        inputRef.current?.click();
    };

    const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError("");
        setStatus("");

        const f = e.target.files?.[0] ?? null;
        if (!f) {
            setFile(null);
            return;
        }

        const name = f.name.toLowerCase();
        const isCsv = name.endsWith(".csv");
        const isXlsx = name.endsWith(".xlsx");

        if (!isCsv && !isXlsx) {
            setFile(null);
            setError("Only .csv or .xlsx files are allowed.");
            e.target.value = "";
            return;
        }

        setFile(f);
    };

    const upload = async () => {
        setError("");
        setStatus("");

        if (!file) {
            setError("Pick a CSV or XLSX file first.");
            return;
        }

        setUploading(true);
        setStatus("Uploading...");

        try {
            const fd = new FormData();
            fd.append("file", file);

            const res = await fetch("/api/sap-import", {
                method: "POST",
                body: fd,
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                setStatus("");
                setError(data?.error ?? "Upload failed");
                return;
            }

            setStatus(`Done. Inserted: ${data.inserted}, Updated: ${data.updated}, Skipped: ${data.skipped}`);
        } catch {
            setStatus("");
            setError("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,text/csv"
                style={{ display: "none" }}
                onChange={onPick}
            />

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button
                    onClick={openPicker}
                    style={{
                        background: "#005596",
                        color: "white",
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                    }}
                >
                    Choose CSV / XLSX
                </button>

                <button
                    onClick={upload}
                    disabled={!file || uploading}
                    style={{
                        background: !file || uploading ? "#999" : "#013156",
                        color: "white",
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "none",
                        cursor: !file || uploading ? "not-allowed" : "pointer",
                    }}
                >
                    {uploading ? "Uploading..." : "Upload"}
                </button>

                <span style={{ fontSize: 14 }}>
          {file ? `Selected: ${file.name}` : "No file selected"}
        </span>
            </div>

            {error && <p style={{ color: "red", margin: 0 }}>{error}</p>}
            {status && <p style={{ margin: 0 }}>{status}</p>}
        </div>
    );
};