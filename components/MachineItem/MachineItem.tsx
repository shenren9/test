import Link from "next/link";
import "./MachineItem.css";

interface MachineProps {
  id: number;
  name: string;
  zone: string;
  status: string;
}

export const MachineItem = ({ machine }: { machine: MachineProps }) => {
  // Encapsulated Logic: Map Status to Colors
  const getStatusConfig = (status: string) => {
    switch (status.toUpperCase()) {
      case "GOOD":
        return { badge: "status-bg-green", indicator: "status-green" };
      case "Y1":
        return { badge: "status-bg-yellow", indicator: "status-yellow" };
      case "Y2":
        return { badge: "status-bg-red", indicator: "status-red" };
      default:
        return { badge: "bg-gray-500", indicator: "bg-gray-400" };
    }
  };

  const config = getStatusConfig(machine.status);

  return (
    <Link href={`/machine?id=${machine.name}`} className="machine-item">
      <div>
        <div className="machine-name">{machine.name}</div>
        <div className="machine-zone">{machine.zone}</div>
      </div>

      <span className={`status-badge ${config.badge}`}>{machine.status}</span>

      <div className={`status-indicator ${config.indicator}`}></div>
    </Link>
  );
};
