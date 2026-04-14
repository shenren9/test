"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertItem } from "../components/AlertItem/AlertItem";
import { MachineList } from "../components/MachineList/MachineList";
import { assignAlert, fetchMachinePredictions, setAlertCompleted, setAlertVerificationStatus, unassignAlert } from "@/lib/actions";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertInfo, Prediction } from "./AlertInfo";

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

interface Props {
  groups: Group[];
  machines: Machine[];
  allAlerts: Prediction[];
  currentUserId: string;
  initialMachine?: string;
}

// Local component for grouping of complete and incomplete alerts inside alerts
function AlertListItem({ alert, isSelected, onClick, now, isMobile, completed}: {
  alert: Prediction,
  isSelected: boolean,
  onClick: () => void,
  now: number
  isMobile: boolean;
  completed: boolean;
})
 {
  return (
    <div
      onClick={onClick}
      // TODO : choose a better color
      className={`cursor-pointer overflow-clip rounded-lg transition-all ${ isSelected && "ring-3 ring-black scale-[1.01]"}`}
    >
      <AlertItem
        id={alert.id}
        machineName={alert.machine_name}
        fault={alert.description}
        severity={alert.kind as "Y1" | "Y2" | "Spike"}
        percentage={alert.certainty}
        created={alert.created_at}
        failDate={alert.fail_timestamp}
        now={now}
        isMobile={isMobile}
        completed={completed}
      />
    </div>
  );
}

export default function AlertViewClient({ groups, machines, allAlerts, currentUserId, initialMachine }: Props) {

  const searchParams = useSearchParams();

  const [showIncomplete, setShowIncomplete] = useState(() => {
    const completed = searchParams.get("completed");
    return completed === "true" ? false : true;  // default open if no param
  });

  const [showCompleted, setShowCompleted] = useState(() => {
    const completed = searchParams.get("completed");
    return completed === "true" ? true : false;
  });

  const [selectedMachines, setSelectedMachines] = useState<string[]>(initialMachine ? [initialMachine] : []);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedAlertId, setSelectedAlertId] = useState<string | undefined>(
    () => searchParams.get("alertId") ?? undefined
  );

  const [now, setNow] = useState<number>(0);
  const [hydrated, setHydrated] = useState(false);
  const [alertsState, setAlertsState] = useState<Prediction[]>(allAlerts);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  const [actionError, setActionError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const [sortMethods, setSortMethods] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);


  useEffect(() => {
    setNow(Date.now());
    setHydrated(true);
  }, []);

  useEffect(() => {
    const id = searchParams.get("alertId");
    if (id) setSelectedAlertId(id);
  }, [searchParams]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 670);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hydrated]); 

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
    let results = alerts;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (alert) =>
          alert.machine_name.toLowerCase().includes(query) ||
          alert.description.some((d) => d.toLowerCase().includes(query)) ||
          alert.kind.toLowerCase().includes(query)
      );
    }

    if (sortMethods.length > 0) {
      const activeSort = sortMethods[sortMethods.length - 1];
      results = [...results].sort((a, b) => {
        switch (activeSort) {
          case "certainty-asc":
            return a.certainty - b.certainty;
          case "certainty-desc":
            return b.certainty - a.certainty;
          case "date-asc":
            return new Date(a.fail_timestamp).getTime() - new Date(b.fail_timestamp).getTime();
          case "date-desc":
            return new Date(b.fail_timestamp).getTime() - new Date(a.fail_timestamp).getTime();
          default:
            return 0;
        }
      });
    }


    return results;
  }, [alerts, searchQuery, sortMethods]);


  // Separate alerts into "completed" and "incomplete" this needs to be declared after filteredAlerts

  const { incompleteAlerts, completedAlerts } = useMemo(() => {
    const incomplete = filteredAlerts.filter((a) => !a.completed);
    const completed = filteredAlerts.filter((a) => a.completed);

    return {
      incompleteAlerts: incomplete,
      completedAlerts: completed,
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

  useEffect(() => {
    const interval = setInterval(reloadAlerts, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleAlertClick = (alertId: string) => {
    setSelectedAlertId(alertId);
    const isCompleted = alertsState.find((a) => a.id === alertId)?.completed;
    setShowIncomplete(!isCompleted);
    setShowCompleted(!!isCompleted);
    };

  useEffect(() => {
    if (isMobile && selectedAlertId) {
      router.push(`/alert_view/mobile_alert_info?id=${selectedAlertId}`);
    }
  }, [isMobile]);

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

  const SORT_OPTIONS = [
    { value: "certainty-asc", label: "Certainty ↑" },
    { value: "certainty-desc", label: "Certainty ↓" },
    { value: "date-asc", label: "Date ↑" },
    { value: "date-desc", label: "Date ↓" },
  ];

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

        <div className="search-filter-row">
          <div className="search-container">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search alerts..."
              className="search-input"
            />
          </div>

          <div className="filter-dropdown-wrapper">
            <button
              className={`filter-toggle-btn ${filterOpen ? "active" : ""} ${sortMethods.length > 0 ? "has-selection" : ""}`}
              onClick={() => setFilterOpen((o) => !o)}>
              Sort
              {sortMethods.length > 0 && (
                <span className="filter-count">{sortMethods.length}</span>
              )}
              <span className="filter-drop">{filterOpen ? "▲" : "▼"}</span>
            </button>

            {filterOpen && (
              <div className="filter-dropdown-menu">
                {SORT_OPTIONS.map((opt) => {
                  const active = sortMethods.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      className={`filter-option-btn ${active ? "selected" : ""}`}
                      onClick={() => {
                        const group = opt.value.startsWith("certainty") ? "certainty" : "date";
                        setSortMethods((prev) => {
                          const withoutGroup = prev.filter((v) => !v.startsWith(group));
                          return active ? withoutGroup : [...withoutGroup, opt.value];
                        });
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
                {sortMethods.length > 0 && (
                  <button
                    className="filter-clear-btn"
                    onClick={() => setSortMethods([])}
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>
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

                  {showIncomplete && hydrated &&(
                    <div className="px-3 py-2 space-y-3 overflow-hidden">
                      {incompleteAlerts.map((alert) => (
                        <AlertListItem
                          key={alert.id}
                          alert={alert}
                          isSelected={selectedAlert?.id === alert.id}
                          onClick={() => handleAlertClick(alert.id)}
                          now={now}
                          isMobile={isMobile}
                          completed={alert.completed}
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

                  {showCompleted && hydrated && (
                    <div className="isolate px-3 py-2 space-y-3 overflow-hidden">
                      {completedAlerts.map((alert) => (
                        <AlertListItem
                          key={alert.id}
                          alert={alert}
                          isSelected={selectedAlert?.id === alert.id}
                          onClick={() => handleAlertClick(alert.id)}
                          now={now}
                          isMobile={isMobile}
                          completed={alert.completed}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </section>

        {hydrated && selectedAlert && !isMobile && (
          <section className="info-panel-card">
            <h3 className="panel-header-title">Information</h3>
            <div className="flex-1 my-5 overflow-y-auto">
              <AlertInfo
                selectedAlert={selectedAlert}
                currentUserId={currentUserId}
                busy={busy}
                actionError={actionError}
                onAssign={onAssign}
                onUnassign={onUnassign}
                onToggleCompleted={onToggleCompleted}
                onSetVerification={onSetVerification}
                setBusy={setBusy}
                setActionError={setActionError}
              />
            </div>
          </section>
        )}
        </div>
      </main>
  );
}
