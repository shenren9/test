"use client";

import dynamic from "next/dynamic";

const DonutChart = dynamic(
  () => import("./DonutChart").then(m => m.DonutChart),
  {
    ssr: false,
    loading: () => (
    <div className="w-full h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-[#35699f] rounded-full animate-spin" />
    </div>
    )
  }
);

export { DonutChart };