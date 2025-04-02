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

  // Calculate optimal time unit width based on total duration
  const calculateTimeUnitWidth = () => {
    if (totalDuration <= 5) return 80; // Very few time units, make them wider
    if (totalDuration <= 10) return 60;
    if (totalDuration <= 20) return 45;
    if (totalDuration <= 30) return 35;
    return 30; // Default width for longer durations
  };

  // Always use 1 as step size for consistent intervals
  const stepSize = 1;
  const timeScale = Array.from(
    { length: Math.ceil(totalDuration + 1) },
    (_, i) => i
  );

  const timeUnitWidth = calculateTimeUnitWidth();

  // Calculate container width with minimum constraint
  const minContainerWidth = 400; // Minimum width in pixels
  const calculatedWidth = timeScale.length * timeUnitWidth;
  const containerWidth = Math.max(minContainerWidth, calculatedWidth);

  return (
    <div className="flex items-center gap-4 w-full">
      {/* CPU Label */}
      <div className="w-16 shrink-0 text-[#7F8588] text-[13px] font-medium">
        {cpuId}
      </div>

      {/* Gantt Chart */}
      <div className="flex-1 relative overflow-x-auto">
        {/* Time markers */}
        <div
          className="flex mb-2"
          style={{
            width: containerWidth,
            minWidth: containerWidth,
          }}
        >
          {timeScale.map((time) => (
            <div
              key={time}
              className="text-center text-[11px] text-[#7F8588] font-medium"
              style={{
                width: timeUnitWidth,
                minWidth: timeUnitWidth,
              }}
            >
              {time}
            </div>
          ))}
        </div>

        {/* Chart container with grid */}
        <div
          className="relative h-12 bg-[#1A1D1F] rounded"
          style={{
            width: containerWidth,
            minWidth: containerWidth,
          }}
        >
          {/* Process blocks */}
          {processes.map((process) => (
            <div
              key={process.id}
              className="absolute h-full rounded-md flex items-center justify-center text-xs text-black font-medium transition-all duration-200 hover:brightness-110"
              style={{
                left: process.startTime * timeUnitWidth,
                width: process.duration * timeUnitWidth,
                backgroundColor: process.color,
                minWidth: Math.max(
                  timeUnitWidth,
                  process.duration * timeUnitWidth
                ),
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
