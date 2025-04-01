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

  return (
    <div className="flex items-center gap-4">
      {/* CPU Label */}
      <div className="w-16 text-[#7F8588] text-[13px] font-medium">{cpuId}</div>

      {/* Gantt Chart */}
      <div className="flex-1 relative">
        {/* Time markers */}
        <div className="flex mb-2">
          {timeScale.map((time) => (
            <div
              key={time}
              className="flex-1 text-[#7F8588] text-[11px] text-center"
              style={{ minWidth: "40px" }}
            >
              {time}
            </div>
          ))}
        </div>

        {/* Chart container with grid */}
        <div className="relative h-10 bg-[#1A1D1F]">
          {/* Grid lines */}
          <div className="absolute inset-0 flex pointer-events-none">
            {timeScale.map((time) => (
              <div
                key={time}
                className="flex-1 border-l border-[#242A2D] last:border-r"
                style={{ minWidth: "40px" }}
              />
            ))}
          </div>

          {/* Process blocks */}
          {processes.map((process) => (
            <div
              key={process.id}
              className="absolute h-full flex items-center justify-center text-[12px] font-medium transition-all duration-200 hover:brightness-110"
              style={{
                left: `${(process.startTime / totalDuration) * 100}%`,
                width: `${(process.duration / totalDuration) * 100}%`,
                backgroundColor: process.color,
                color: "#1A1D1F",
                minWidth: `${40 * process.duration}px`,
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
