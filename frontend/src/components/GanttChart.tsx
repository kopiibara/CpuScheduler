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

  // Calculate the step size based on total duration
  const getStepSize = (duration: number) => {
    if (duration <= 10) return 1;
    if (duration <= 50) return 5;
    if (duration <= 100) return 10;
    if (duration <= 500) return 50;
    return 100;
  };

  const stepSize = getStepSize(totalDuration);
  const timeScale = Array.from(
    { length: Math.ceil((totalDuration + 1) / stepSize) },
    (_, i) => i * stepSize
  );

  // Adjust time unit width based on total duration
  const getTimeUnitWidth = (duration: number) => {
    if (duration <= 10) return 24;
    if (duration <= 50) return 20;
    if (duration <= 100) return 16;
    if (duration <= 500) return 12;
    return 8;
  };

  const timeUnitWidth = getTimeUnitWidth(totalDuration);

  return (
    <div className="flex items-center gap-4">
      {/* CPU Label */}
      <div className="w-16 shrink-0 text-[#7F8588] text-[13px] font-medium">
        {cpuId}
      </div>

      {/* Gantt Chart */}
      <div className="flex-1 relative overflow-x-auto">
        {/* Time markers */}
        <div
          className="flex mb-2"
          style={{ minWidth: timeScale.length * timeUnitWidth * stepSize }}
        >
          {timeScale.map((time) => (
            <div
              key={time}
              className="text-center text-[10px] text-[#7F8588]"
              style={{ width: timeUnitWidth * stepSize }}
            >
              {time}
            </div>
          ))}
        </div>

        {/* Chart container with grid */}
        <div
          className="relative h-10 bg-[#1A1D1F]"
          style={{ minWidth: timeScale.length * timeUnitWidth * stepSize }}
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
