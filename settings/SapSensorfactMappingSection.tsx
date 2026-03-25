"use client";

import {
  clearSapMappingTargets,
  listSapSensorfactMappingData,
  updateSapMappingTargets,
  type SapMappingMachineOption,
  type SapToSensorfactMappingRow,
} from "./sap-mapping-actions";
import { useCallback, useEffect, useState } from "react";
import styles from "./settings.module.css";

function machineLabel(m: SapMappingMachineOption) {
  return m.groupName ? `${m.name} (${m.groupName})` : m.name;
}

export function availableFlPortions(fl: string): string[] {
  const trimmed = fl.trim();
  if (!trimmed) return [];

  const segments = trimmed
    .split("-")
    .map((s) => s.trim());
  const result = [];
  let portion = "";
  for (const segment of segments) {
    portion += segment;
    result.push(portion);
    portion += "-";
  }
  return result;
}

function MappingRowEditor({
  row,
  groups,
  machines,
  onDone,
  onError,
}: {
  row: SapToSensorfactMappingRow;
  groups: { id: string; name: string }[];
  machines: SapMappingMachineOption[];
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const initialKind: "group" | "machine" =
    row.sensorfactMachineId ? "machine" : "group";
  const [targetKind, setTargetKind] = useState<"group" | "machine">(initialKind);
  const [groupId, setGroupId] = useState(row.sensorfactGroupId || "");
  const [machineId, setMachineId] = useState(row.sensorfactMachineId || "");
  const [saving, setSaving] = useState(false);

  async function saveRow() {
    setSaving(true);
    try {
      const r =
        await updateSapMappingTargets(row.sapMachineId, targetKind === "machine" ? machineId : groupId, targetKind);
      if (!r.ok) {
        onError(r.error);
        return;
      }
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr>
      <td>
        <code style={{ wordBreak: "break-all" }}>{row.sapMachineId}</code>
      </td>
      <td>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "0.85rem" }}>
              <input
                type="radio"
                name={`kind-${row.sapMachineId}`}
                checked={targetKind === "group"}
                onChange={() => setTargetKind("group")}
              />
              Group
            </label>
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "0.85rem" }}>
              <input
                type="radio"
                name={`kind-${row.sapMachineId}`}
                checked={targetKind === "machine"}
                onChange={() => setTargetKind("machine")}
              />
              Machine
            </label>
          </div>
          {targetKind === "group" ? (
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              style={{ maxWidth: 280, padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc" }}
            >
              <option value="">None</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              style={{ maxWidth: 280, padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc" }}
            >
              <option value="">None</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {machineLabel(m)}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            className={styles.mappingAddButton}
            disabled={saving}
            onClick={saveRow}
            style={{ alignSelf: "flex-start" }}
          >
            {saving ? "Saving…" : "Save row"}
          </button>
        </div>
      </td>
      <td style={{ verticalAlign: "top" }}>
        <button
          type="button"
          className={styles.mappingDeleteBtn}
          onClick={async () => {
            const r = await clearSapMappingTargets(row.sapMachineId);
            if (!r.ok) onError(r.error);
            else onDone();
          }}
        >
          Delete row
        </button>
      </td>
    </tr>
  );
}

export function SapSensorfactMappingSection() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [functionalLocations, setFunctionalLocations] = useState<string[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [machines, setMachines] = useState<SapMappingMachineOption[]>([]);
  const [mappings, setMappings] = useState<SapToSensorfactMappingRow[]>([]);

  const [formFl, setFormFl] = useState("");
  const [formFlPortion, setFormFlPortion] = useState("");
  const [formTargetKind, setFormTargetKind] = useState<"group" | "machine">("group");
  const [formGroupId, setFormGroupId] = useState("");
  const [formMachineId, setFormMachineId] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(async () => {
    setLoadError(null);
    const res = await listSapSensorfactMappingData();
    if (!res.ok) {
      setLoadError(res.error);
      setLoading(false);
      return;
    }
    setFunctionalLocations(res.functionalLocations);
    setGroups(res.groups);
    setMachines(res.machines);
    setMappings(res.mappings);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleFormSave() {;
    setAdding(true);
    try {
      const r = await updateSapMappingTargets(
        formFlPortion,
        formTargetKind === "group" ? formGroupId : formMachineId,
        formTargetKind
      );
      if (!r.ok) {
        setFormError(r.error);
        return;
      }
      setFormFl("");
      setFormFlPortion("");
      setFormGroupId("");
      setFormMachineId("");
      await refresh();
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className={styles.importData}>
      <h1 className={styles.bodyTitle}>SAP ↔ Sensorfact mapping</h1>
      <p>
        The key is derived from the SAP <strong>Functional Location</strong>.
        Pick the exact key prefix to store, then link to one Sensorfact group or machine.
      </p>
      {loadError && (
        <p style={{ color: "#c62828" }}>Error: {loadError}</p>
      )}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
        {formError && (
          <p style={{ color: "#c62828" }}>Error: {formError}</p>
        )}

          <h2 className={styles.mappingFormHeading}>Add or update by location</h2>
          <div className={styles.mappingAddRow}>
            <label>
              Functional location (from SAP)
              <select
                value={formFl}
                onChange={(e) => {
                  setFormFl(e.target.value);
                  setFormFlPortion(e.target.value);
                }}
              >
                <option value="">Select…</option>
                {functionalLocations.map((fl) => (
                  <option key={fl} value={fl}>
                    {fl}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Key
              <select
                value={formFlPortion}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormFlPortion(v);
                }}
                disabled={!formFl}
              >
                {!formFl ? (
                  <option value="full">Select location first…</option>
                ) : (
                  availableFlPortions(formFl).map((d) => {
                    return (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    );
                  })
                )}
              </select>
            </label>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "0.85rem" }}>
                <input
                  type="radio"
                  name="form-target-kind"
                  checked={formTargetKind === "group"}
                  onChange={() => setFormTargetKind("group")}
                />
                Group
              </label>
              <label>
                <input
                  type="radio"
                  name="form-target-kind"
                  checked={formTargetKind === "machine"}
                  onChange={() => setFormTargetKind("machine")}
                />
                Machine
              </label>
            </div>
            {formTargetKind === "group" ? (
              <label>
                Sensorfact group
                <select
                  value={formGroupId}
                  onChange={(e) => setFormGroupId(e.target.value)}
                >
                  <option value="">Select…</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                Sensorfact machine
                <select
                  value={formMachineId}
                  onChange={(e) => setFormMachineId(e.target.value)}
                >
                  <option value="">Select…</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {machineLabel(m)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              className={styles.mappingAddButton}
              disabled={
                adding ||
                !formFl ||
                !(formTargetKind === "group" ? formGroupId : formMachineId)
              }
              onClick={handleFormSave}
            >
              {adding ? "Saving…" : "Save mapping"}
            </button>
          </div>

          <h2 className={styles.mappingFormHeading}>Configured mappings</h2>
          <div className={styles.mappingTableWrap}>
            <table className={styles.mappingTable}>
              <thead>
                <tr>
                  <th>Stored key</th>
                  <th>Sensorfact target</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {mappings.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ color: "#666" }}>
                      No configured mappings yet. Use the form above to assign a Sensorfact group or machine.
                    </td>
                  </tr>
                ) : (
                  mappings.map((row) => (
                    <MappingRowEditor
                      key={row.sapMachineId}
                      row={row}
                      groups={groups}
                      machines={machines}
                      onDone={() => refresh()}
                      onError={(msg) => setFormError(msg)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
