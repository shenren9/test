'use client';

import { BackButton } from "../components/BackButton"
import { LogOutButton } from "../components/LogOutButton"
import { ImportButton } from "../components/ImportButton";
import { approveUser, deleteUser, demoteUser, promoteUser } from "./actions";
import { SapSensorfactMappingSection } from "./SapSensorfactMappingSection";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { handleSubscribeAction, deletePushSubscriptionAction, getDevicePushSubscription } from "@/app/actions/notifications";
import { getUserSettings, updateUserSettings, fetchModelStatus, triggerRetrain, fetchTrainingStatus } from "@/lib/actions";
import { authClient } from "@/lib/auth-client";

import styles from './settings.module.css'

// Convert VAPID key for browser use
const urlB64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Approve User List Item
function ApproveUser({ name, email, id, admin, approved }: { name: string; email: string; id: string; admin: boolean; approved: boolean }) {
  const [status, setStatus] = useState<"idle" | "deleted" | "error">("idle");
  const [adminStatus, setAdminStatus] = useState(admin);
  const [approvedStatus, setApprovedStatus] = useState(approved);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function approve() {
    setStatus("idle");
    const formData = new FormData();
    formData.append("id", id);
    try {
      await approveUser(formData);
      setStatus("idle");
      setApprovedStatus(true);
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err?.message || "An error occurred");
    }
  }

  async function promote() {
    setStatus("idle");
    const formData = new FormData();
    formData.append("id", id);
    try {
      await promoteUser(formData);
      setStatus("idle");
      setAdminStatus(true);
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err?.message || "An error occurred");
    }
  }

  async function demote() {
    setStatus("idle");
    const formData = new FormData();
    formData.append("id", id);
    try {
      await demoteUser(formData);
      setStatus("idle");
      setAdminStatus(false);
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err?.message || "An error occurred");
    }
  }

  async function reject() {
    setStatus("idle");
    const formData = new FormData();
    formData.append("id", id);
    try {
      await deleteUser(formData);
      setStatus("deleted");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err?.message || "An error occurred");
    }
  }

  let result = null;
  if (status === "deleted") result = <span style={{ color: "red", fontWeight: "bold" }}>Deleted</span>;
  if (status === "error") result = <span style={{ color: "red" }}>{errorMessage}</span>;

  let buttons = (
    <>
      <button onClick={approve} className={styles.btnApprove}>Approve</button>
      <button onClick={reject} className={styles.btnReject}>Reject</button>
    </>
  )
  if (approvedStatus) {
    buttons = (
      <>
        <button onClick={reject} className={styles.btnReject}>Delete</button>
        {adminStatus ?
          <button onClick={demote} className={styles.btnDemote}>Demote</button>
        :
          <button onClick={promote} className={styles.btnPromote}>Promote</button>
        }
      </>
    )
  }

  return (
    <div className={styles.userRow}>
      <span className={styles.userEmail}><strong>{name}</strong> ({email})</span>
      {(status === "idle" || status === "error") && (
        buttons
      )}
      {result}
    </div>
  );
}

// Main Component: Settings Client
export default function SettingsClient({
  usersToApprove,
  machines,
  isAdmin,
}: {
  usersToApprove: { name: string; email: string; id: string; admin: boolean; approved: boolean }[];
  machines: { id: string; name: string }[];
  isAdmin: boolean;
}) {
  const { data: session } = useSession();
  const router = useRouter();

  const [retrainStatus, setRetrainStatus] = useState<"idle" | "triggered" | "error">("idle");
  const [lastModel, setLastModel] = useState<{ name: string; created_at: string } | null>(null);
  const [trainingRun, setTrainingRun] = useState<{
    status: string;
    total_tasks: number;
    completed_tasks: number;
    failed_tasks: number;
    current_task: string | null;
    error: string | null;
    started_at: string;
    finished_at: string | null;
  } | null>(null);

  // State for checkboxes
  const [prefs, setPrefs] = useState({
    push: false,
    email: false,
    y1: false,
    y2: false,
  });

  const [editName, setEditName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState(false);

  // State for logic
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch VAPID Key on mount
  useEffect(() => {
    async function fetchKey() {
      try {
        const res = await fetch("/api/secrets?key=VAPID_PUBLIC_KEY");
        const data = await res.json();
        if (data.value) setVapidKey(data.value);
      } catch (err) {
        console.error("Failed to fetch VAPID key:", err);
      }
    }
    fetchKey();
  }, []);

  useEffect(() => {
    async function loadModelAndTrainingStatus() {
      try {
        const [modelRes, trainingRes] = await Promise.all([
          fetchModelStatus(),
          fetchTrainingStatus(),
        ]);
        if (modelRes.ok && modelRes.models.length > 0) {
          setLastModel(modelRes.models[0]);
        }
        if (trainingRes.ok && trainingRes.run) {
          setTrainingRun(trainingRes.run);
          if (trainingRes.run.status === "running" || trainingRes.run.status === "pending") {
            setRetrainStatus("triggered");
          } else {
            setRetrainStatus("idle");
          }
        }
      } catch (err) {
        console.error("Failed to load model/training status:", err);
      }
    }
    loadModelAndTrainingStatus();
    const interval = setInterval(loadModelAndTrainingStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(interval);
  }, [router]);

  // Fetch User Settings from DB on mount (to set initial checkbox state)
  useEffect(() => {
    async function loadSettings() {
      if (!session?.user?.id) { setLoading(false); return; }
      try {
        const { ok, user } = await getUserSettings(session.user.id);

        if (ok && user) {
          setPrefs(prev => ({ ...prev, email: user.email_notifications || false }));
        }
        setLoading(false);

        let isPushEnabled = false;
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();

          if (ok && user && subscription?.endpoint) {
            const result = await getDevicePushSubscription(subscription.endpoint);
            isPushEnabled = result.isRegistered ?? false;
          }
        } catch (swErr) {
          console.warn("Service Worker not ready yet:", swErr);
        }

        if (ok && user) {
          setPrefs({
            push: isPushEnabled,
            email: user.email_notifications || false,
            y1: user.y1_notifications || false,
            y2: user.y2_notifications || false,
          });
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [session?.user?.id]);

  // Helper: Trigger the Browser Push Subscription
  const subscribeToPush = async () => {
    if (!vapidKey) return console.error("No VAPID key found");
    if (!("Notification" in window)) return alert("This browser does not support notifications");

    const permission = await window.Notification.requestPermission();
    if (permission === "granted") {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(vapidKey),
        });

        // Save subscription object to DB
        if (session?.user?.id) { await handleSubscribeAction(session.user.id, subscription.toJSON()); }
      } catch (err) {
        console.error("SW Registration failed", err);
        alert("Failed to enable push notifications on this device.");
      }
    } else {
      alert("Notifications permission denied. Please reset permissions in your browser settings.");
    }
  };

  // Unsubscribe user from push notifications (can be used in the future for emails)
  async function unsubscribeUser() {
    if (!session?.user?.id) return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Unsubscribe from the push service
      await subscription.unsubscribe();

      // Remove the DB entry using the endpoint as the identifier
      await deletePushSubscriptionAction(session.user.id, subscription.endpoint);

      // Unregister the worker entirely
      await registration.unregister();
    }
  }

  const handleRetrain = async () => {
    setRetrainStatus("triggered");
    try {
      const result = await triggerRetrain();
      if (!result.ok) throw new Error(result.error);
    } catch (err: any) {
      setRetrainStatus("error");
      alert("Failed to trigger retrain: " + err.message);
    }
  };

  // Handle Save Button Click
  const handleSave = async () => {
    if (!session?.user?.id) return;
    setSaving(true);

    try {
      // Update preference booleans in DB
      const result = await updateUserSettings(
        session.user.id,
        session.user.name || "",
        session.user.email || "",
        prefs.email,
        prefs.push,
        prefs.y1,
        prefs.y2,
      );

      if (!result.ok) throw new Error(result.error);

      alert("Settings saved successfully!");
      setSaving(false);

      // Sync Browser/SW state with the DB preference
      if (prefs.push) {
        await subscribeToPush();
      } else {
        await unsubscribeUser();
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      setPrefs({
        ...prefs,
        push: !!subscription,
      });

      alert("Settings saved successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Error saving settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (id: keyof typeof prefs) => {
    setPrefs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const [exportForm, setExportForm] = useState({
    startDate: "",
    endDate: "",
    minCertainty: "",
    maxCertainty: "",
    machineId: "",
    kinds: [] as string[],
    completed: "",
    verified: "",
    format: "csv",
  });
  const [exporting, setExporting] = useState(false);

  const handleKindToggle = (kind: string) => {
    setExportForm(prev => ({
      ...prev,
      kinds: prev.kinds.includes(kind) ? prev.kinds.filter(k => k !== kind) : [...prev.kinds, kind],
    }));
  };

  const handleExport = async () => {
    if (!exportForm.startDate || !exportForm.endDate) {
      alert("Start Date and End Date are required.");
      return;
    }
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("startDate", exportForm.startDate);
      params.set("endDate", exportForm.endDate);
      if (exportForm.minCertainty) params.set("minCertainty", exportForm.minCertainty);
      if (exportForm.maxCertainty) params.set("maxCertainty", exportForm.maxCertainty);
      if (exportForm.machineId) params.set("machineIds", exportForm.machineId);
      if (exportForm.kinds.length > 0) params.set("kinds", exportForm.kinds.join(","));
      if (exportForm.completed) params.set("completed", exportForm.completed);
      if (exportForm.verified) params.set("verified", exportForm.verified);

      if (exportForm.format === "pdf") {
        params.set("format", "json");
        const res = await fetch(`/api/export-alerts?${params.toString()}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Export failed" }));
          alert(err.error || "Export failed");
          return;
        }
        const data = await res.json();
        const { jsPDF } = await import("jspdf");
        const autoTable = (await import("jspdf-autotable")).default;

        const doc = new jsPDF({ orientation: "landscape" });
        const today = new Date().toISOString().split("T")[0];
        doc.setFontSize(14);
        doc.text(`Alerts Export - ${today}`, 14, 15);

        const columns = [
          "Alert ID", "Machine Name", "Kind", "Certainty (%)", "Description",
          "Estimated Failure Date", "Created At", "Verification Status",
          "Assigned To", "Completed"
        ];
        const rows = data.map((row: Record<string, string>) =>
          columns.map(col => row[col] || "")
        );

        autoTable(doc, {
          head: [columns],
          body: rows,
          startY: 22,
          styles: { fontSize: 7 },
          headStyles: { fillColor: [0, 53, 128] },
        });

        doc.save(`alerts-export-${today}.pdf`);
      } else {
        const res = await fetch(`/api/export-alerts?${params.toString()}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Export failed" }));
          alert(err.error || "Export failed");
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `alerts-export-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      console.error("Export error:", err);
      alert("Failed to export alerts.");
    } finally {
      setExporting(false);
    }
  };

  const handleAccountSave = async () => {
    if (!session?.user?.id) return;
    setAccountSaving(true);
    setAccountError(null);
    try {
      if (editName && editName !== session.user.name) {
        await authClient.updateUser({ name: editName });
      }
      if (currentPassword && newPassword) {
        await authClient.changePassword({
          currentPassword,
          newPassword,
          revokeOtherSessions: false,
        });
      }
      alert("Account updated successfully!");
    } catch (err: any) {
      setAccountError(err?.message || "Failed to update account");
    } finally {
      setAccountSaving(false);
    }
  };


  return (
    <main className={styles.settingsPage}>
      <div className={styles.settingsGrid}>
        <div className={styles.sidebar}>
          <BackButton />
        </div>
        <div className={styles.main}>
          <h1 className={styles.title}>Settings</h1>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Account Information</h2>
            <div className={styles.cardBody}>
              <p style={{ margin: 0 }}><strong>Name:</strong> {session?.user?.name ?? "—"}</p>
              <p style={{ margin: 0 }}><strong>Email:</strong> {session?.user?.email ?? "—"}</p>
              <button className={styles.btn} onClick={() => setEditingAccount(!editingAccount)}>
                {editingAccount ? "Cancel" : "Edit"}
              </button>
              {editingAccount && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px', maxWidth: '400px' }}>
                  <input
                    type="text"
                    placeholder={`Name (current: ${session?.user?.name ?? "—"})`}
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className={styles.exportInput}
                  />
                  <input
                    type="password"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className={styles.exportInput}
                  />
                  <input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className={styles.exportInput}
                  />
                  {accountError && <p style={{ color: 'red', fontSize: '0.85rem', margin: 0 }}>{accountError}</p>}
                  <button className={styles.btn} onClick={handleAccountSave} disabled={accountSaving}>
                    {accountSaving ? "Saving..." : "Update Account"}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Notifications</h2>
            <fieldset className={styles.cardBody} disabled={loading || saving}>
              <legend style={{ marginBottom: "8px", fontSize: "0.95rem" }}>Opt in for notifications</legend>
              <div className={styles.checkboxRow}>
                <input type="checkbox" id="push" checked={prefs.push} onChange={() => handleToggle("push")} />
                <label htmlFor="push">Push Notifications</label>
              </div>
              <div className={styles.checkboxRow}>
                <input type="checkbox" id="email" checked={prefs.email} onChange={() => handleToggle("email")} />
                <label htmlFor="email">Email</label>
              </div>
              <button className={styles.btn} onClick={handleSave}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </fieldset>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Model Status</h2>
            <div className={styles.cardBody}>
              <div className={styles.modelInfo}>
                {lastModel ? (
                  <p style={{ margin: 0 }}>Last trained: {new Date(lastModel.created_at).toLocaleString()} ({lastModel.name})</p>
                ) : (
                  <p style={{ margin: 0 }}>No models trained yet</p>
                )}
              </div>

              {trainingRun && (trainingRun.status === "running" || trainingRun.status === "pending") && (
                <div className={styles.trainingProgress}>
                  <div className={styles.trainingProgressHeader}>
                    <span className={styles.trainingStatusDot} />
                    <span>{trainingRun.status === "pending" ? "Training queued..." : "Training in progress..."}</span>
                    <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#6b7280" }}>
                      {trainingRun.completed_tasks + trainingRun.failed_tasks} / {trainingRun.total_tasks}
                    </span>
                  </div>
                  <div className={styles.trainingProgressTrack}>
                    <div
                      className={styles.trainingProgressBar}
                      style={{ width: trainingRun.total_tasks > 0 ? `${((trainingRun.completed_tasks + trainingRun.failed_tasks) / trainingRun.total_tasks) * 100}%` : "0%" }}
                    />
                  </div>
                  {trainingRun.current_task && (
                    <p className={styles.trainingCurrentTask}>{trainingRun.current_task}</p>
                  )}
                </div>
              )}

              {trainingRun && trainingRun.status === "completed" && (
                <div className={styles.trainingDone}>
                  <span style={{ color: "#16a34a", fontWeight: 600 }}>Training completed</span>
                  {trainingRun.finished_at && (
                    <span style={{ fontSize: "0.8rem", color: "#6b7280" }}> at {new Date(trainingRun.finished_at).toLocaleString()}</span>
                  )}
                  {trainingRun.failed_tasks > 0 && (
                    <span style={{ fontSize: "0.8rem", color: "#dc2626", marginLeft: 8 }}>({trainingRun.failed_tasks} task{trainingRun.failed_tasks > 1 ? "s" : ""} failed)</span>
                  )}
                </div>
              )}

              {trainingRun && trainingRun.status === "failed" && (
                <div className={styles.trainingError}>
                  <strong>Training failed</strong>
                  {trainingRun.error && <p style={{ margin: "4px 0 0", fontSize: "0.8rem", whiteSpace: "pre-wrap" }}>{trainingRun.error}</p>}
                </div>
              )}

              <button
                className={styles.btn}
                onClick={handleRetrain}
                disabled={retrainStatus === "triggered"}
              >
                {retrainStatus === "triggered" ? "Training..." : "Retrain Now"}
              </button>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Import SAP Data</h2>
            <div className={styles.cardBody}>
              <p style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, color: "#4b5563" }}>The SAP data should have the columns Functional Location, Notification type, malfunction start date and time, notification id, and a description.</p>
              <ImportButton />
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Export Alerts</h2>
            <div className={styles.cardBody}>
              <div className={styles.exportPairRow}>
                <div className={styles.exportField}>
                  <label>Start Date</label>
                  <input type="date" className={styles.exportInput} value={exportForm.startDate} onChange={e => setExportForm(prev => ({ ...prev, startDate: e.target.value }))} />
                </div>
                <div className={styles.exportField}>
                  <label>End Date</label>
                  <input type="date" className={styles.exportInput} value={exportForm.endDate} onChange={e => setExportForm(prev => ({ ...prev, endDate: e.target.value }))} />
                </div>
              </div>
              <div className={styles.exportPairRow}>
                <div className={styles.exportField}>
                  <label>Min Certainty (%)</label>
                  <input type="number" min="0" max="100" className={styles.exportInput} value={exportForm.minCertainty} onChange={e => setExportForm(prev => ({ ...prev, minCertainty: e.target.value }))} />
                </div>
                <div className={styles.exportField}>
                  <label>Max Certainty (%)</label>
                  <input type="number" min="0" max="100" className={styles.exportInput} value={exportForm.maxCertainty} onChange={e => setExportForm(prev => ({ ...prev, maxCertainty: e.target.value }))} />
                </div>
              </div>
              <div className={styles.exportPairRow}>
                <div className={styles.exportField}>
                  <label>Machine</label>
                  <select className={styles.exportInput} value={exportForm.machineId} onChange={e => setExportForm(prev => ({ ...prev, machineId: e.target.value }))}>
                    <option value="">All Machines</option>
                    {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className={styles.exportField}>
                  <label>Kind</label>
                  <div className={styles.exportKinds}>
                    {["Y1", "Y2", "Spike"].map(kind => (
                      <label key={kind} style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                        <input type="checkbox" checked={exportForm.kinds.includes(kind)} onChange={() => handleKindToggle(kind)} />
                        {kind}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className={styles.exportPairRow}>
                <div className={styles.exportField}>
                  <label>Completed</label>
                  <select className={styles.exportInput} value={exportForm.completed} onChange={e => setExportForm(prev => ({ ...prev, completed: e.target.value }))}>
                    <option value="">Any</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div className={styles.exportField}>
                  <label>Verification</label>
                  <select className={styles.exportInput} value={exportForm.verified} onChange={e => setExportForm(prev => ({ ...prev, verified: e.target.value }))}>
                    <option value="">Any</option>
                    <option value="true">Confirmed</option>
                    <option value="false">Rejected</option>
                    <option value="null">Unverified</option>
                  </select>
                </div>
              </div>
              <div className={styles.exportPairRow}>
                <div className={styles.exportField}>
                  <label>Format</label>
                  <select className={styles.exportInput} value={exportForm.format} onChange={e => setExportForm(prev => ({ ...prev, format: e.target.value }))}>
                    <option value="csv">CSV</option>
                    <option value="pdf">PDF</option>
                  </select>
                </div>
              </div>
              <button className={styles.btn} onClick={handleExport} disabled={exporting}>
                {exporting ? "Exporting..." : exportForm.format === "pdf" ? "Export PDF" : "Export CSV"}
              </button>
            </div>
          </div>

          {isAdmin && <SapSensorfactMappingSection />}

          {usersToApprove.length > 0 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Users to Approve</h2>
              <div className={styles.cardBody}>
                {usersToApprove.map((user) => (
                  <ApproveUser key={user.id} name={user.name} email={user.email} id={user.id} admin={user.admin} approved={user.approved} />
                ))}
              </div>
            </div>
          )}

          <div className={styles.logoutSection}>
            <LogOutButton />
          </div>
        </div>
      </div>
    </main>
  );
}