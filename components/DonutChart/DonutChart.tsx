'use client';
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartData, ChartOptions } from "chart.js";
import "./DonutChart.css";

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartProps {
  chartData: { machine: string; value: number }[];
  position?: "top" | "bottom" | "left" | "right"; 
}

export const DonutChart = ({ chartData, position = "bottom" }: PieChartProps) => {
  const data: ChartData<"doughnut"> = {
    labels: chartData.map((item) => item.machine),
    datasets: [
      {
        label: "Power Usage", 
        data: chartData.map((item) => item.value),
        backgroundColor: [
          "#3DC265", 
          "#BD2A1F",
          "#FFAE4C",
          "#808080"
        ],
        borderWidth: 0, 
      }
    ]
  };

  const options: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: position,
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 8,
        font: (context) => {
          const width = context.chart.width;
          const size = Math.round(width / 20); 
          return {
            size: size < 8 ? 8 : size > 11 ? 11 : size,
            weight: 'bold'
          };
        }
      }
    }
  }
};

  return <Doughnut data={data} options={options} />;
};
