"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IoMdHome, IoMdNotifications, IoMdSettings } from "react-icons/io";
import { HiOutlineCpuChip } from "react-icons/hi2";
import Image from "next/image";

import "./NavBar.css";

export const NavBar = () => {
  const pathname = usePathname();

  //To hide navbar on auth-related pages
  const hideNavPrefixes = ["/login", "/forgot-password", "/reset-password"];
  if (hideNavPrefixes.some((p) => pathname?.startsWith(p))) return null;

  const navItems = [
    { name: "Home", href: "/", icon: <IoMdHome /> },
    { name: "Alerts", href: "/alert_view", icon: <IoMdNotifications /> },
    { name: "Machine", href: "/machine", icon: <HiOutlineCpuChip /> },
  ];

  return (
    <div className="dashboard-title">
      <div className="logos">
        <Image
          src="/logo.svg"
          width={30}
          height={8}
          className="h-full w-auto object-contain"
          alt="Logo"
          priority
        />
        <span>Machine Performance Prediction</span>
      </div>
      <nav className="dashboard-navbar">
        <div className="nav-switcher">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`nav-link ${pathname === item.href ? "active" : "inactive"}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.name}</span>
            </Link>
          ))}
        </div>
        <Link href="/settings">
          <button className="settings-trigger">
            <IoMdSettings size={18} />
          </button>
        </Link>
      </nav>
    </div>
  );
};