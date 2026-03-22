"use client";
import { useState } from "react";
import "./MachineList.css";

interface Machine {
  name: string;
  group_name: string;
  group_id: string;
}

interface Group {
  id: string;
  name: string;
}

interface MachineListProps {
  groups: Group[];
  machines: Machine[];
  selectedMachines: string[];
  onSelectMachine: (name: string) => void;
}

export const MachineList = ({
  groups,
  machines,
  selectedMachines = [],
  onSelectMachine,
}: MachineListProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const machinesByGroup = machines.reduce(
    (acc, machine) => {
      const groupId = machine.group_id;
      if (groupId) {
        if (!acc[groupId]) acc[groupId] = [];
        acc[groupId].push(machine);
      }
      return acc;
    },
    {} as Record<string, Machine[]>,
  );
  
  const groupsContent = groups.map((group, groupIndex) => {
  const groupMachines = machinesByGroup[group.id] || [];
  const isFirstGroup = groupIndex === 0;
  const isLastGroup = groupIndex === groups.length - 1;
  const hasNoMachines = groupMachines.length === 0;
  return (
    <div key={group.id} className="machine-group">
      <div className={`group-header ${isFirstGroup ? 'first-group' : ''} ${isLastGroup && hasNoMachines ? 'last-group' : ''}`}>
        {group.name}
      </div>
      {groupMachines.map((machine, machineIndex) => {
        const isLastMachine = machineIndex === groupMachines.length - 1;
        const isLastOverall = isLastGroup && isLastMachine;
        const isActive = selectedMachines.length > 0 && selectedMachines.includes(machine.name);
        return (
          <button
            key={machine.name}
            onClick={() => onSelectMachine(machine.name)}
            className={`machine-button ${isActive ? 'active' : 'inactive'} ${isLastOverall ? 'last-machine' : ''}`}
          >
            {machine.name}
          </button>
        );
      })}
    </div>
    );
  });
  
  return (
    <>
      <div className="mobile-container md:hidden">
        <button onClick={() => setIsOpen(!isOpen)} className="mobile-dropdown-button">
          <span>{selectedMachines.length > 0 ? selectedMachines.join(', ') : "Select machines"}</span>
          <span>{isOpen ? "▲" : "▼"}</span>
        </button>
        {isOpen && (
          <div className="mobile-dropdown-menu">
            {groupsContent}
          </div>
        )}
      </div>
      <aside className="desktop-sidebar hidden md:flex">
        {groupsContent}
      </aside>
    </>
  );
};
