"use server";

import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { headers } from "next/headers";

export type SapMappingMachineOption = {
  id: string;
  name: string;
  groupName: string | null;
};

export type SapMappingGroupOption = {
  id: string;
  name: string;
};

export type SapToSensorfactMappingRow = {
  sapMachineId: string;
  sensorfactMachineId: string | null;
  sensorfactGroupId: string | null;
  sensorfactMachineName: string | null;
  sensorfactGroupName: string | null;
  sensorfactMachineGroupName: string | null;
};

export type ListSapSensorfactMappingDataResult =
  | {
      ok: true;
      functionalLocations: string[];
      groups: SapMappingGroupOption[];
      machines: SapMappingMachineOption[];
      mappings: SapToSensorfactMappingRow[];
    }
  | { ok: false; error: string };

export async function listSapSensorfactMappingData(): Promise<ListSapSensorfactMappingDataResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.admin) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    const [flRes, groupsRes, machinesRes, mapRes] = await Promise.all([
      pool.query<{ fl: string }>(
        `SELECT DISTINCT TRIM(data->>'Functional Location') AS fl
         FROM sap
         WHERE TRIM(COALESCE(data->>'Functional Location', '')) <> ''
         ORDER BY fl`
      ),
      pool.query<{ id: string; name: string }>(
        `SELECT id, name FROM groups ORDER BY name`
      ),
      pool.query<{ id: string; name: string; group_name: string | null }>(
        `SELECT m.id, m.name, g.name AS group_name
         FROM machines m
         LEFT JOIN groups g ON g.id = m.group_id
         ORDER BY g.name, m.name`
      ),
      pool.query<{
        sap_machine_id: string;
        sensorfact_machine_id: string | null;
        sensorfact_group_id: string | null;
        machine_name: string | null;
        machine_group_name: string | null;
        mapping_group_name: string | null;
      }>(
        `SELECT m.sap_machine_id,
                m.sensorfact_machine_id,
                m.sensorfact_group_id,
                mac.name AS machine_name,
                macgr.name AS machine_group_name,
                mgr.name AS mapping_group_name
         FROM sap_to_sensorfact_mapping m
         LEFT JOIN machines mac ON mac.id = m.sensorfact_machine_id
         LEFT JOIN groups macgr ON macgr.id = mac.group_id
         LEFT JOIN groups mgr ON mgr.id = m.sensorfact_group_id
         WHERE m.sensorfact_machine_id IS NOT NULL OR m.sensorfact_group_id IS NOT NULL
         ORDER BY m.sap_machine_id`
      ),
    ]);

    return {
      ok: true,
      functionalLocations: flRes.rows.map((r) => r.fl),
      groups: groupsRes.rows.map((r) => ({ id: r.id, name: r.name })),
      machines: machinesRes.rows.map((r) => ({
        id: r.id,
        name: r.name,
        groupName: r.group_name,
      })),
      mappings: mapRes.rows.map((r) => ({
        sapMachineId: r.sap_machine_id,
        sensorfactMachineId: r.sensorfact_machine_id,
        sensorfactGroupId: r.sensorfact_group_id,
        sensorfactMachineName: r.machine_name,
        sensorfactGroupName: r.mapping_group_name,
        sensorfactMachineGroupName: r.machine_group_name,
      })),
    };
  } catch (e) {
    console.error("listSapSensorfactMappingData:", e);
    return { ok: false, error: "Failed to load mapping data" };
  }
}

export async function updateSapMappingTargets(
  sapId: string,
  targetId: string | null,
  targetType: "machine" | "group"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.admin) {
    return { ok: false, error: "Unauthorized" };
  }

  if (!sapId) {
    return { ok: false, error: "Missing SAP location" };
  }

  if (targetType !== "machine" && targetType !== "group") {
    return { ok: false, error: "Invalid target type" };
  }

  const targetMachineId = targetType === "machine" ? targetId : null;
  const targetGroupId = targetType === "group" ? targetId : null;

  try {
    await pool.query(
      `INSERT INTO sap_to_sensorfact_mapping (sap_machine_id, sensorfact_machine_id, sensorfact_group_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (sap_machine_id) DO UPDATE
         SET sensorfact_machine_id = EXCLUDED.sensorfact_machine_id,
             sensorfact_group_id = EXCLUDED.sensorfact_group_id`,
      [sapId, targetMachineId, targetGroupId]
    );
    return { ok: true };
  } catch (e) {
    console.error("updateSapMappingTargets:", e);
    return { ok: false, error: "Failed to update mapping" };
  }
}

export async function clearSapMappingTargets(
  sapMachineId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await Promise.all([
    updateSapMappingTargets(sapMachineId, null, "machine"),
    updateSapMappingTargets(sapMachineId, null, "group"),
  ]);
  if (r.some((r) => !r.ok)) {
    return { ok: false, error: "Failed to clear mapping" };
  }
  return { ok: true };
}
