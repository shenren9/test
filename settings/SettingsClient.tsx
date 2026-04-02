'use client';

import { BackButton } from "../components/BackButton"
import { LogOutButton } from "../components/LogOutButton"
import { ImportButton } from "../components/ImportButton";
import { approveUser, deleteUser, demoteUser, promoteUser } from "./actions";
import { SapSensorfactMappingSection } from "./SapSensorfactMappingSection";
import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { handleSubscribeAction, deletePushSubscriptionAction, getDevicePushSubscription } from "@/app/actions/notifications";
import { getUserSettings, updateUserSettings } from "@/lib/actions";
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
function ApproveUser({ email, id, admin, approved }: { email: string; id: string; admin: boolean; approved: boolean }) {
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
          <button onClick={approve} className="px-5 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors font-semibold text-sm">Approve</button>
          <button onClick={reject} className="px-5 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors font-semibold text-sm">Reject</button>
        </>
  )
  if (approvedStatus) {
    buttons = (
      <>
        <button onClick={reject} className="px-5 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors font-semibold text-sm">Delete</button>
        {adminStatus ?
          <button onClick={demote} className="px-5 py-2 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors font-semibold text-sm">Demote</button>
        :
        <button onClick={promote} className="px-5 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors font-semibold text-sm">Promote</button>
        }
      </>
    )
  }

  return (
    <li style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <span>{email}</span>
      {(status === "idle" || status === "error") && buttons}
      {result}
    </li>
  );
}

// Main Component: Settings Client
export default function SettingsClient({
  usersToApprove,
  machines,
  isAdmin,
}: {
  usersToApprove: { email: string; id: string; admin: boolean; approved: boolean }[];
  machines: { id: string; name: string }[];
  isAdmin: boolean;
}) {
  const { data: session } = useSession();

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
    <main style={{ height: 'calc(100vh - 12vh)', padding: '10px 15px 30px 15px' }}>
      <div className={styles.pageGrid}>
        <div className={styles.sidebar}>
          <BackButton />
        </div>
        <div className={styles.body}>
          <div className={styles.mobileBack}>
            <BackButton />
          </div>
          <div className={styles.subheader}>
            <h1 className={styles.title}>Settings</h1>
          </div>
          <div className={styles.topRow}>
            <div className={styles.accountInfo}>
              <h1 className={styles.bodyTitle}>Account Information</h1>
              <div className={styles.accountInfoContent}>
                <p><strong>Name:</strong> {session?.user?.name ?? "—"}</p>
                <p><strong>Email:</strong> {session?.user?.email ?? "—"}</p>
              </div>
              <button className={styles.saveButton} onClick={() => setEditingAccount(!editingAccount)}>
                {editingAccount ? "Cancel" : "Edit"}
              </button>

              {editingAccount && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px', maxWidth: '400px' }}>
                  <input
                    type="text"
                    placeholder={`Name (current: ${session?.user?.name ?? "—"})`}
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="px-3 py-2 rounded-md border border-gray-300 text-sm outline-none w-full"
                  />
                  <input
                    type="password"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="px-3 py-2 rounded-md border border-gray-300 text-sm outline-none w-full"
                  />
                  <input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="px-3 py-2 rounded-md border border-gray-300 text-sm outline-none w-full"
                  />
                  {accountError && <p style={{ color: 'red', fontSize: '0.85rem' }}>{accountError}</p>}
                  <button className={styles.saveButton} onClick={handleAccountSave} disabled={accountSaving}>
                    {accountSaving ? "Saving..." : "Update Account"}
                  </button>
                </div>
              )}

            </div>
            <div className={styles.notifications}>
              <h1 className={styles.bodyTitle}>Notifications</h1>
              <fieldset className={styles.bodyContent} disabled={loading || saving}>
                <legend>Opt in for notifications</legend>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <input type="checkbox" id="push" checked={prefs.push} onChange={() => handleToggle("push")} />
                  <label htmlFor="push" style={{ cursor: "pointer" }}>Push Notifications</label>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <input type="checkbox" id="email" checked={prefs.email} onChange={() => handleToggle("email")} />
                  <label htmlFor="email" style={{ cursor: "pointer" }}>Email</label>
                </div>
                <button className={styles.saveButton} onClick={handleSave}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </fieldset>
            </div>
            <div className={styles.importData}>
              <h1 className={styles.bodyTitle}>Import SAP Data</h1>
              <p>The SAP data should have the columns Functional Location, Notification type, malfunction start date and time, notification id, and a description.</p>
              <div className={styles.bodyContent}>
                <ImportButton />
              </div>
            </div>
          </div>

          <div className={styles.bottomRow}>
            <div className={styles.exportAlerts}>
              <h1 className={styles.bodyTitle}>Export Alerts</h1>
              <div className={styles.bodyContent}>
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
                <button className={styles.saveButton} onClick={handleExport} disabled={exporting}>
                  {exporting ? "Exporting..." : exportForm.format === "pdf" ? "Export PDF" : "Export CSV"}
                </button>
              </div>
            </div>

            {isAdmin && <SapSensorfactMappingSection />}

            {usersToApprove.length > 0 && (
              <div className={styles.usersToApprove}>
                <h1 className={styles.bodyTitle}>Users to Approve</h1>
                <div className={styles.bodyContent}>
                  <ul>
                    {usersToApprove.map((user) => (
                      <ApproveUser key={user.id} email={user.email} id={user.id} admin={user.admin} approved={user.approved} />
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className={styles.logOut}>
            <LogOutButton />
          </div>
        </div>
      </div>
    </main>
  );
}