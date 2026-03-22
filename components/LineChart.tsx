'use client'; 

import { Line } from "react-chartjs-2";
import {Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, ChartData, ChartOptions} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

interface MachineSeries {
  machine: string;
  values: { time: string; value: number }[];
}

interface LineChartProps {
  chartData: MachineSeries[];
}

export const LineChart = ({ chartData = [] }: LineChartProps) => {
  if (!chartData || chartData.length === 0) {
    return <div className="p-4 text-center">No Data Available</div>;
  }

  const labels = chartData[0]?.values?.map((item) => item.time) || [];

  const colorPalette = [
    "rgb(53, 162, 235)", "rgb(255, 99, 132)", "rgb(75, 192, 192)", 
    "rgb(255, 205, 86)", "rgb(153, 102, 255)", "rgb(255, 159, 64)"
  ];

  const data: ChartData<"line"> = {
    labels: labels,
    datasets: chartData.map((series, index) => ({
      label: series.machine,
      data: series.values.map((item) => item.value),
      borderColor: colorPalette[index % colorPalette.length],
      backgroundColor: colorPalette[index % colorPalette.length].replace("rgb", "rgba").replace(")", ", 0.2)")
    }))
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false, 
    plugins: {
      legend: {
        position: "top" as const
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return <Line data={data} options={options} />;
};