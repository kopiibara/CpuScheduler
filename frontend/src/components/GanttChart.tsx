import React from "react";

interface Process {
  id: string;
  name: string;
  startTime: number;
  duration: number;
  color: string;
}

interface GanttChartProps {
  processes: Process[];
  cpuId: string;
}

const GanttChart: React.FC<GanttChartProps> = ({ processes, cpuId }) => {
  const totalDuration = processes.reduce(
    (acc, curr) => Math.max(acc, curr.startTime + curr.duration),
    0
  );
  const timeScale = Array.from({ length: totalDuration + 1 }, (_, i) => i);

  // Ensure each time unit has a minimum width
  const timeUnitWidth = 24; // Pixels per time unit

  return (
    <div className="flex items-center gap-4">
      {/* CPU Label */}
      <div className="w-16 shrink-0 text-[#7F8588] text-[13px] font-medium">
        {cpuId}
      </div>

      {/* Gantt Chart */}
      <div className="flex-1 relative">
        {/* Time markers */}
        <div
          className="flex mb-2"
          style={{ minWidth: timeScale.length * timeUnitWidth }}
        >
          {timeScale.map((time) => (
            <div
              key={time}
              className="flex-1 text-center text-[10px] text-[#7F8588]"
              style={{ minWidth: timeUnitWidth }}
            >
              {time}
            </div>
          ))}
        </div>

        {/* Chart container with grid */}
        <div
          className="relative h-10 bg-[#1A1D1F]"
          style={{ minWidth: timeScale.length * timeUnitWidth }}
        >
          {/* Process blocks */}
          {processes.map((process) => (
            <div
              key={process.id}
              className="absolute h-full rounded-md flex items-center justify-center text-xs text-black font-medium"
              style={{
                left: `${(process.startTime / totalDuration) * 100}%`,
                width: `${(process.duration / totalDuration) * 100}%`,
                minWidth: process.duration * timeUnitWidth,
                backgroundColor: process.color,
              }}
            >
              {process.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
