"use client";

import { useState, useEffect } from "react";
import { CommentsPanel } from "./CommentsPanel";

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

interface AlertInfoProps {
  selectedAlert: Prediction;
  currentUserId: string;
  busy: boolean;
  actionError: string | undefined;
  onAssign: () => Promise<void>;
  onUnassign: () => Promise<void>;
  onToggleCompleted: () => Promise<void>;
  onSetVerification: (status: boolean | null) => Promise<void>;
  setBusy: (v: boolean) => void;
  setActionError: (v: string | undefined) => void;
}

export function AlertInfo({
  selectedAlert,
  currentUserId,
  busy,
  actionError,
  onAssign,
  onUnassign,
  onToggleCompleted,
  onSetVerification,
  setBusy,
  setActionError,
}: AlertInfoProps) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTimeout(() => setHydrated(true), 0);
  }, []);

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
    <div className="space-y-4 text-[#333]">
      <div>
        <h4 className="text-[1.1rem] font-bold text-[#2b5a7a] leading-tight">
          {selectedAlert.description} - {selectedAlert.machine_name}
        </h4>
        <p className="text-[0.75rem] text-[#999] mt-1">
          Created: {hydrated ? new Date(selectedAlert.created_at).toLocaleString() : "N/A"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 text-sm">
        <div><strong>Severity:</strong> {selectedAlert.kind}</div>
        <div><strong>Certainty:</strong> {(selectedAlert.certainty * 100).toFixed(1)}%</div>
        <div>
          <strong>Est. Failure:</strong>{" "}
          {selectedAlert.fail_timestamp && hydrated
            ? new Date(selectedAlert.fail_timestamp).toLocaleDateString()
            : "N/A"}
        </div>
        <div><strong>Assigned:</strong> {assignedLabel}</div>
        <div><strong>Verification:</strong> {verificationLabel}</div>
        <div><strong>Completed:</strong> {selectedAlert.completed ? "Yes" : "No"}</div>
      </div>

      {actionError && (
        <div className="text-sm text-red-700 bg-red-100 border border-red-200 rounded-md p-2">
          {actionError}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {isAssignedToMe ? (
          <button type="button" disabled={busy}
            className="px-3 py-2 rounded-md bg-gray-600 text-white text-sm"
            onClick={onUnassign}>
            Unassign me
          </button>
        ) : (
          <button type="button" disabled={busy}
            className="px-3 py-2 rounded-md bg-[#3ba99c] text-white text-sm"
            onClick={onAssign}>
            Assign to me
          </button>
        )}

        <button type="button" disabled={busy}
          className="px-3 py-2 rounded-md bg-[#2b5a7a] text-white text-sm"
          onClick={onToggleCompleted}>
          {selectedAlert.completed ? "Mark incomplete" : "Mark completed"}
        </button>

        {!isVerificationPositive && (
          <button type="button" disabled={busy}
            className="px-3 py-2 rounded-md bg-green-700 text-white text-sm"
            onClick={() => onSetVerification(true)}>
            Mark positive
          </button>
        )}

        {!isVerificationNegative && (
          <button type="button" disabled={busy}
            className="px-3 py-2 rounded-md bg-red-700 text-white text-sm"
            onClick={() => onSetVerification(false)}>
            Mark negative
          </button>
        )}

        {!isVerificationUnknown && (
          <button type="button" disabled={busy}
            className="px-3 py-2 rounded-md bg-gray-300 text-gray-900 text-sm"
            onClick={() => onSetVerification(null)}>
            Clear verification
          </button>
        )}
      </div>

      <CommentsPanel
        predictionId={selectedAlert.id}
        busy={busy}
        setBusy={setBusy}
        setActionError={setActionError}
      />
    </div>
  );
}