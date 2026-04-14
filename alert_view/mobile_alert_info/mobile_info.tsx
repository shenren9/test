"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {fetchMachinePredictions, assignAlert, unassignAlert, setAlertCompleted, setAlertVerificationStatus,} from "@/lib/actions";
import { AlertInfo, Prediction } from "../AlertInfo";
import "../alert_view.css";


interface MobileAlertInfoProps {
  currentUserId: string; 
}

export default function MobileAlertInfo({ currentUserId }: MobileAlertInfoProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  const [allAlerts, setAllAlerts] = useState<Prediction[]>([]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();

  useEffect(() => {
    const check = () => {
      if (window.innerWidth > 768) router.push("/alert_view");
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [router]);

  useEffect(() => {
    if (!id) return;
    fetchMachinePredictions().then((res) => {
      if (res.ok) setAllAlerts(res.data);
    });
  }, [id]);

  const selectedAlert = allAlerts.find((a) => a.id === id) ?? null;

  const reloadAlerts = async () => {
    const res = await fetchMachinePredictions();
    if (res.ok) setAllAlerts(res.data);
  };

  const patchAlert = (patch: Partial<Prediction>) => {
    if (!id) return;
    setAllAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const onAssign = async () => {
    if (!selectedAlert || busy) return;
    setActionError(undefined);
    setBusy(true);
    const res = await assignAlert(selectedAlert.id);
    if (!res.ok) { setBusy(false); setActionError(res.error); return; }
    await reloadAlerts();
    setBusy(false);
  };

  const onUnassign = async () => {
    if (!selectedAlert || busy) return;
    setActionError(undefined);
    setBusy(true);
    const res = await unassignAlert(selectedAlert.id);
    if (!res.ok) { setBusy(false); setActionError(res.error); return; }
    await reloadAlerts();
    setBusy(false);
  };

  const onToggleCompleted = async () => {
    if (!selectedAlert || busy) return;
    setActionError(undefined);
    setBusy(true);
    const res = await setAlertCompleted(selectedAlert.id, !selectedAlert.completed);
    if (!res.ok) { setBusy(false); setActionError(res.error); return; }
    patchAlert({ completed: res.data.completed });
    await reloadAlerts();
    setBusy(false);
  };

  const onSetVerification = async (status: boolean | null) => {
    if (!selectedAlert || busy) return;
    setActionError(undefined);
    setBusy(true);
    const res = await setAlertVerificationStatus(selectedAlert.id, status);
    if (!res.ok) { setBusy(false); setActionError(res.error); return; }
    patchAlert({ verification_status: res.data.verification_status });
    await reloadAlerts();
    setBusy(false);
  };

  if (!selectedAlert) {
    return (
      <div className="alert-page-container">
        <div className="p-4 text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="alert-page-container">
      <div className="mobile-content-area">
        <div className="bg-white/95 rounded-[20px] p-5">
          <button onClick={() => router.back()} className="mobile-nav-back-btn mb-4">
            ← Back
          </button>
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
      </div>
    </div>
  );
}