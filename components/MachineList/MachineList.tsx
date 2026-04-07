"use client";
import { useEffect, useState } from "react";
import { GrFormViewHide } from "react-icons/gr";
import { FaRegEye } from "react-icons/fa";
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

const STORAGE_KEY = "machine-list-order";

function loadGroupOrder(groups: Group[]): Group[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return groups;
    const savedIds: string[] = JSON.parse(saved);
    const savedGroups = savedIds.map((id) => groups.find((g) => g.id === id)).filter(Boolean) as Group[];
    const newGroups = groups.filter((g) => !savedIds.includes(g.id));
    return [...savedGroups, ...newGroups];
  } catch {
    return groups;
  }
}

const COLLAPSED_KEY = "machine-list-collapsed";

export const MachineList = ({
  groups,
  machines,
  selectedMachines = [],
  onSelectMachine,
}: MachineListProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [orderedGroups, setOrderedGroups] = useState<Group[]>(groups);

  useEffect(() => {
    setOrderedGroups(loadGroupOrder(groups));
  }, [groups]);
    

  const moveGroup = (index: number, direction: "up" | "down") => {
    const newGroups = [...orderedGroups];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newGroups[index], newGroups[swapIndex]] = [newGroups[swapIndex], newGroups[index]];
    setOrderedGroups(newGroups);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newGroups.map((g) => g.id)));
  };

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

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_KEY);
      if (saved) setCollapsedGroups(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  const toggleCollapse = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const groupsContent = orderedGroups.map((group, groupIndex) => {
    const groupMachines = machinesByGroup[group.id] || [];
    const isFirstGroup = groupIndex === 0;
    const isLastGroup = groupIndex === orderedGroups.length - 1;
    const hasNoMachines = groupMachines.length === 0;
    const isCollapsed = collapsedGroups.has(group.id);
    return (
      <div key={group.id} className="machine-group">
        <div className={`group-header ${isFirstGroup ? 'first-group' : ''} ${isLastGroup && hasNoMachines ? 'last-group' : ''}`}>
          <div className="group-header-inner">
            <div className="group-show">
              <button className="eye-btn" onClick={() => toggleCollapse(group.id)}>
                {isCollapsed ? <GrFormViewHide /> : <FaRegEye />}
              </button>
            </div>
            <span className="group-name">{group.name}</span>
            <div className="group-arrows">
              <button
                className="arrow-btn"
                onClick={() => moveGroup(groupIndex, "up")}
                disabled={isFirstGroup}
                aria-label={`Move ${group.name} up`}
              >▲</button>
              <button
                className="arrow-btn"
                onClick={() => moveGroup(groupIndex, "down")}
                disabled={isLastGroup}
                aria-label={`Move ${group.name} down`}
              >▼</button>
            </div>
          </div>
        </div>
        {!isCollapsed && groupMachines.map((machine, machineIndex) => {
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
        <div className="flex-1 overflow-y-auto pr-2 w-full flex flex-col min-h-0">
          {groupsContent}
        </div>
      </aside>
    </>
  );
};