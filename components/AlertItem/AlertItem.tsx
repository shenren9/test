"use client";

import "./AlertItem.css";

interface AlertItemProps {
  machineName: string;
  fault: string;
  severity: "Y1" | "Y2" | "Spike";
  percentage: number;
  created: Date;
  failDate: Date;
  now: number;
}

export const AlertItem = ({ machineName, fault, severity, percentage, created, failDate, now}: AlertItemProps) => {
  percentage = Math.round(percentage * 100)

  const styles = {
    Y2: {
      card: "alert-high",
      tag: "tag-high",
      label: "Y2",
    },
    Y1: {
      card: "alert-medium",
      tag: "tag-medium",
      label: "Y1",
    },
    Spike: {
      card: "alert-spike",
      tag: "tag-spike",
      label: "Spike",
    },
  };

  const getRelativeTime = (dateInput: Date | string): string => {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return "Invalid date";

    const units = [
      { label: "year", seconds: 31536000 },
      { label: "month", seconds: 2592000 },
      { label: "week", seconds: 604800 },
      { label: "day", seconds: 86400 },
      { label: "hour", seconds: 3600 },
      { label: "minute", seconds: 60 },
      { label: "second", seconds: 1 },
    ];

    const diffInSeconds = (now - date.getTime()) / 1000;
    const isFuture = diffInSeconds < 0;
    const absSeconds = Math.floor(Math.abs(diffInSeconds));

    for (const { label, seconds } of units) {
      const interval = Math.floor(absSeconds / seconds);
      if (interval >= 1) {
        const suffix = interval === 1 ? "" : "s";
        return isFuture
          ? `in ${interval} ${label}${suffix}`
          : `${interval} ${label}${suffix} ago`;
      }
    }

    return "just now";
  };

  const current = styles[severity];

  return (
    <div className={`alert-card ${current.card}`}>
      <div className="alert-header">
        <div className="header-left">
          <span className="machine-name">{machineName}</span>
          <span className="prediction-age">{getRelativeTime(created)}</span>
        </div>
        <div className={`severity-badge ${current.tag}`}>
          {current.label} {getRelativeTime(failDate)}
        </div>
      </div>

      <p className="fault-text">{fault}</p>

      <div className="stats-container">
        <div className="stats-row">
          <span className="progress-label">Fault Probability</span>
          <div className="stat-meta">
            <span className="prediction-text">{percentage}%</span>
            <span className="prediction-text"></span>
          </div>
        </div>

        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
