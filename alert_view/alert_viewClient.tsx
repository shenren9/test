"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertItem } from "../components/AlertItem/AlertItem";
import { MachineList } from "../components/MachineList/MachineList";
import { assignAlert, fetchMachinePredictions, setAlertCompleted, setAlertVerificationStatus, unassignAlert } from "@/lib/actions";
import { CommentsPanel } from "./CommentsPanel";

import "./alert_view.css";

interface Machine {
  name: string;
  group_name: string;
  group_id: string;
}

interface Group {
  name: string;
  id: string;
}

interface Assignee {
  id: string;
  name: string;
  email: string;
}

interface Prediction {
  id: string;
  kind: string;
  certainty: number;
  fail_timestamp: Date;
  created_at: Date;
  description: string;
  machine_name: string;

  assignees: Assignee[];
  completed: boolean;
  verification_status: boolean | null;
}

interface Props {
  groups: Group[];
  machines: Machine[];
  allAlerts: Prediction[];
  currentUserId: string;
  initialMachine?: string;
}

// Local component for grouping of complete and incomplete alerts inside alerts
function AlertListItem({ alert, isSelected, onClick, now }: {
  alert: Prediction,
  isSelected: boolean,
  onClick: () => void,
  now: number
}) {
  return (
    <div
      onClick={onClick}
      // TODO : choose a better color
      className={`cursor-pointer overflow-clip rounded-lg transition-all ${ isSelected && "ring-3 ring-black scale-[1.01]"}`}
    >
      <AlertItem
        machineName={alert.machine_name}
        fault={alert.description}
        severity={alert.kind as "Y1" | "Y2" | "Spike"}
        percentage={alert.certainty}
        created={alert.created_at}
        failDate={alert.fail_timestamp}
        now={now}
      />
    </div>
  );
}

export default function AlertViewClient({ groups, machines, allAlerts, currentUserId, initialMachine }: Props) {
  const [selectedMachines, setSelectedMachines] = useState<string[]>(initialMachine ? [initialMachine] : []);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAlertId, setSelectedAlertId] = useState<string | undefined>(undefined);

  const [now, setNow] = useState(() => Date.now());
  const [hydrated, setHydrated] = useState(false);

  const [alertsState, setAlertsState] = useState<Prediction[]>(allAlerts);
  const [actionError, setActionError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTimeout(() => setHydrated(true), 0);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setAlertsState(allAlerts);
  }, [allAlerts]);

  useEffect(() => {
    if (initialMachine) {
      setSelectedMachines([initialMachine]);
    }
  }, [initialMachine]);
  
  const alerts = useMemo(() => {
    if (selectedMachines.length === 0) return alertsState;
    return alertsState.filter((alert) => selectedMachines.includes(alert.machine_name));
  }, [alertsState, selectedMachines]);

  /*search bar!! simple for now, might need to add more features (note for me/Julie)*/
  const filteredAlerts = useMemo(() => {
    if (!searchQuery.trim()) return alerts;
    const query = searchQuery.toLowerCase();
    return alerts.filter(
        (alert) =>
            alert.machine_name.toLowerCase().includes(query) ||
            alert.description.toLowerCase().includes(query) ||
            alert.kind.toLowerCase().includes(query),
    );
  }, [alerts, searchQuery]);

  // Separate alerts into "completed" and "incomplete" this needs to be declared after filteredAlerts
  const [showIncomplete, setShowIncomplete] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  const { incompleteAlerts, completedAlerts } = useMemo(() => {
    return {
      incompleteAlerts: filteredAlerts.filter((a) => !a.completed),
      completedAlerts: filteredAlerts.filter((a) => a.completed),
    };
  }, [filteredAlerts]);

  const selectedAlert = useMemo(() => {
    if (selectedAlertId !== undefined) {
      return filteredAlerts.find((a) => a.id === selectedAlertId) ?? filteredAlerts[0];
    }
    return filteredAlerts[0];
  }, [filteredAlerts, selectedAlertId]);

  const patchAlert = (id: string, patch: Partial<Prediction>) => {
    setAlertsState((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const reloadAlerts = async () => {
    const res = await fetchMachinePredictions();
    if (res.ok) setAlertsState(res.data);
  };

  const onAssign = async () => {
    if (!selectedAlert || busy) return;
    setActionError(undefined);
    setBusy(true);

    const res = await assignAlert(selectedAlert.id);
    if (!res.ok) {
      setBusy(false);
      setActionError(res.error);
      return;
    }

    await reloadAlerts();
    setBusy(false);
  };

  const onUnassign = async () => {
    if (!selectedAlert || busy) return;
    setActionError(undefined);
    setBusy(true);

    const res = await unassignAlert(selectedAlert.id);
    if (!res.ok) {
      setBusy(false);
      setActionError(res.error);
      return;
    }

    await reloadAlerts();
    setBusy(false);
  };

  const onSetVerification = async (status: boolean | null) => {
    if (!selectedAlert || busy) return;
    setActionError(undefined);
    setBusy(true);

    const res = await setAlertVerificationStatus(selectedAlert.id, status);
    if (!res.ok) {
      setBusy(false);
      setActionError(res.error);
      return;
    }

    patchAlert(selectedAlert.id, { verification_status: res.data.verification_status });
    await reloadAlerts();
    setBusy(false);
  };

  const onToggleCompleted = async () => {
    if (!selectedAlert || busy) return;
    setActionError(undefined);
    setBusy(true);

    const next = !selectedAlert.completed;
    const res = await setAlertCompleted(selectedAlert.id, next);
    if (!res.ok) {
      setBusy(false);
      setActionError(res.error);
      return;
    }

    patchAlert(selectedAlert.id, { completed: res.data.completed });
    await reloadAlerts();
    setBusy(false);
  };

  const verificationLabel =
      selectedAlert?.verification_status === true
          ? "Positive"
          : selectedAlert?.verification_status === false
              ? "Negative"
              : "Unknown";

  const isAssignedToMe = selectedAlert?.assignees?.some((a) => a.id === currentUserId) ?? false;

  const assignedLabel = !selectedAlert?.assignees?.length
      ? "Unassigned"
      : selectedAlert.assignees.map((a) => a.name || a.email).join(", ");

  const isVerificationPositive = selectedAlert?.verification_status === true;
  const isVerificationNegative = selectedAlert?.verification_status === false;
  const isVerificationUnknown = selectedAlert?.verification_status === null;

  return (
      <main className="alert-page-container">
        <div className="alert-grid-layout">
          <MachineList
              groups={groups}
              machines={machines}
              selectedMachines={selectedMachines}
              onSelectMachine={(name) => {
                if (selectedMachines.includes(name)) {
                  setSelectedMachines(selectedMachines.filter((m) => m !== name));
                } else {
                  setSelectedMachines([...selectedMachines, name]);
                }
              }}
          />

          <div className="search-container">
            <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search alerts..."
                className="w-full px-3 py-2 text-[#616161] text-base outline-none rounded-[6px] focus:ring-1 focus:ring-[#3ba99c] placeholder:text-[#999] bg-transparent"
            />
          </div>

          <section className="alert-panel-card col-start-2 row-start-2">
            <h3 className="panel-header-title">
              Alerts {selectedMachines.length > 0 ? `— ${selectedMachines.join(", ")}` : ""}
            </h3>

            <div className="flex-1 overflow-y-auto pt-1 mt-1 mb-1 space-y-4">
              {filteredAlerts.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  {selectedMachines.length > 0 ? "No predictions found." : "Select a machine."}
                </div>
              ) : (
                <>
                  {/* Incomplete Section */}
                  <section className="flex flex-col mb-6">
                    <div className="top-0 bg-white pb-2">
                      <button
                        onClick={() => setShowIncomplete(!showIncomplete)}
                        className="flex items-center justify-between w-full px-4 py-3 text-sm font-bold text-[#2b5a7a] bg-[#f8fafc] border border-gray-200 rounded-lg shadow-sm"
                      >
                        <span>Incomplete ({incompleteAlerts.length})</span>
                        <span className="text-xs">{showIncomplete ? "COLLAPSE ▲" : "EXPAND ▼"}</span>
                      </button>
                    </div>

                    {showIncomplete && (
                      <div className="px-3 py-2 space-y-3 overflow-hidden">
                        {incompleteAlerts.map((alert) => (
                          <AlertListItem
                            key={alert.id}
                            alert={alert}
                            isSelected={selectedAlert?.id === alert.id}
                            onClick={() => setSelectedAlertId(alert.id)}
                            now={now}
                          />
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Completed Section */}
                  <section className="flex flex-col">
                    <div className="top-0 bg-white pb-2">
                      <button
                        onClick={() => setShowCompleted(!showCompleted)}
                        className="flex items-center justify-between w-full px-4 py-3 text-sm font-bold text-gray-500 bg-[#f8fafc] border border-gray-200 rounded-lg shadow-sm"
                      >
                        <span>Completed ({completedAlerts.length})</span>
                        <span className="text-xs">{showCompleted ? "COLLAPSE ▲" : "EXPAND ▼"}</span>
                      </button>
                    </div>

                    {showCompleted && (
                      <div className="isolate px-3 py-2 space-y-3 overflow-hidden">
                        {completedAlerts.map((alert) => (
                          <AlertListItem
                            key={alert.id}
                            alert={alert}
                            isSelected={selectedAlert?.id === alert.id}
                            onClick={() => setSelectedAlertId(alert.id)}
                            now={now}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </section>

          <section className="info-panel-card">
            <h3 className="panel-header-title">Information</h3>

            <div className="flex-1 my-5 overflow-y-auto text-[#333]">
              {selectedAlert ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[1.1rem] font-bold text-[#2b5a7a] leading-tight">
                        {selectedAlert.description}
                      </h4>
                      <p className="text-[0.75rem] text-[#999] mt-1">
                        Created: {hydrated ? new Date(selectedAlert.created_at).toLocaleString() : "N/A"}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div>
                        <strong>Severity:</strong> {selectedAlert.kind}
                      </div>
                      <div>
                        <strong>Certainty:</strong> {(selectedAlert.certainty * 100).toFixed(1)}%
                      </div>
                      <div>
                        <strong>Est. Failure:</strong>{" "}
                        {selectedAlert.fail_timestamp && hydrated
                            ? new Date(selectedAlert.fail_timestamp).toLocaleDateString()
                            : "N/A"}
                      </div>

                      <div>
                        <strong>Assigned:</strong> {assignedLabel}
                      </div>
                      <div>
                        <strong>Verification:</strong> {verificationLabel}
                      </div>
                      <div>
                        <strong>Completed:</strong> {selectedAlert.completed ? "Yes" : "No"}
                      </div>
                    </div>

                    {actionError !== undefined && (
                        <div className="text-sm text-red-700 bg-red-100 border border-red-200 rounded-md p-2">
                          {actionError}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {isAssignedToMe ? (
                          <button
                              type="button"
                              disabled={busy}
                              className="px-3 py-2 rounded-md bg-gray-600 text-white text-sm"
                              onClick={onUnassign}
                          >
                            Unassign me
                          </button>
                      ) : (
                          <button
                              type="button"
                              disabled={busy}
                              className="px-3 py-2 rounded-md bg-[#3ba99c] text-white text-sm"
                              onClick={onAssign}
                          >
                            Assign to me
                          </button>
                      )}

                      <button
                          type="button"
                          disabled={busy}
                          className="px-3 py-2 rounded-md bg-[#2b5a7a] text-white text-sm"
                          onClick={onToggleCompleted}
                      >
                        {selectedAlert.completed ? "Mark incomplete" : "Mark completed"}
                      </button>

                      {!isVerificationPositive && (
                          <button
                              type="button"
                              disabled={busy}
                              className="px-3 py-2 rounded-md bg-green-700 text-white text-sm"
                              onClick={() => onSetVerification(true)}
                          >
                            Mark positive
                          </button>
                      )}

                      {!isVerificationNegative && (
                          <button
                              type="button"
                              disabled={busy}
                              className="px-3 py-2 rounded-md bg-red-700 text-white text-sm"
                              onClick={() => onSetVerification(false)}
                          >
                            Mark negative
                          </button>
                      )}

                      {!isVerificationUnknown && (
                          <button
                              type="button"
                              disabled={busy}
                              className="px-3 py-2 rounded-md bg-gray-300 text-gray-900 text-sm"
                              onClick={() => onSetVerification(null)}
                          >
                            Clear verification
                          </button>
                      )}
                    </div>

                    {/* Review change: comments moved out */}
                    <CommentsPanel
                        predictionId={selectedAlert.id}
                        busy={busy}
                        setBusy={setBusy}
                        setActionError={setActionError}
                    />
                  </div>
              ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 italic">
                    Select an alert
                  </div>
              )}
            </div>
          </section>
        </div>
      </main>
  );
}
