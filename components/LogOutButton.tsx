"use client";

import { logout } from "@/app/actions/logout";

export const LogOutButton = () => {
  return (
      <form action={logout}>
        <button className="px-8 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors font-semibold text-lg"
            type="submit">
          Log Out
        </button>
      </form>
  );
};