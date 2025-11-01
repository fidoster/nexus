/**
 * Query Activity Heatmap Component
 * Visualizes when users submit queries over time using a calendar heatmap
 */

import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { subMonths } from 'date-fns';

interface QueryHeatmapProps {
  data: Array<{
    date: string;
    count: number;
  }>;
  startDate?: Date;
  endDate?: Date;
}

export default function QueryHeatmap({
  data,
  startDate = subMonths(new Date(), 6),
  endDate = new Date(),
}: QueryHeatmapProps) {
  // Transform data to format expected by CalendarHeatmap
  const values = data.map(item => ({
    date: item.date,
    count: item.count,
  }));

  // Determine color class based on count
  const getColorClass = (value: any): string => {
    if (!value || !value.count || value.count === 0) {
      return 'color-empty';
    }

    // Progressive color scale based on activity
    if (value.count < 3) return 'color-scale-1';
    if (value.count < 6) return 'color-scale-2';
    if (value.count < 10) return 'color-scale-3';
    return 'color-scale-4';
  };

  // Find max count for legend
  const maxCount = Math.max(...data.map(d => d.count), 0);

  return (
    <div className="w-full">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Query Activity Over Time
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Shows when users submitted queries (darker = more activity)
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <CalendarHeatmap
          startDate={startDate}
          endDate={endDate}
          values={values}
          classForValue={getColorClass}
          showWeekdayLabels
        />

        {/* Legend */}
        <div className="flex items-center justify-between mt-4 text-xs">
          <span className="text-gray-500 dark:text-gray-400">Less activity</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm"></div>
            <div className="w-3 h-3 bg-indigo-200 dark:bg-indigo-900 border border-gray-300 dark:border-gray-600 rounded-sm"></div>
            <div className="w-3 h-3 bg-indigo-400 dark:bg-indigo-700 border border-gray-300 dark:border-gray-600 rounded-sm"></div>
            <div className="w-3 h-3 bg-indigo-600 dark:bg-indigo-500 border border-gray-300 dark:border-gray-600 rounded-sm"></div>
            <div className="w-3 h-3 bg-indigo-800 dark:bg-indigo-400 border border-gray-300 dark:border-gray-600 rounded-sm"></div>
          </div>
          <span className="text-gray-500 dark:text-gray-400">More activity</span>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.reduce((sum, d) => sum + d.count, 0)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total Queries</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round(data.reduce((sum, d) => sum + d.count, 0) / Math.max(data.length, 1))}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Avg per Day</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{maxCount}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Peak Day</div>
          </div>
        </div>
      </div>

      {/* Custom styles for heatmap colors */}
      <style>{`
        .react-calendar-heatmap .color-empty {
          fill: rgb(243 244 246);
        }
        .react-calendar-heatmap .color-scale-1 {
          fill: rgb(199 210 254);
        }
        .react-calendar-heatmap .color-scale-2 {
          fill: rgb(129 140 248);
        }
        .react-calendar-heatmap .color-scale-3 {
          fill: rgb(79 70 229);
        }
        .react-calendar-heatmap .color-scale-4 {
          fill: rgb(55 48 163);
        }

        /* Dark mode colors */
        .dark .react-calendar-heatmap .color-empty {
          fill: rgb(55 65 81);
        }
        .dark .react-calendar-heatmap .color-scale-1 {
          fill: rgb(49 46 129);
        }
        .dark .react-calendar-heatmap .color-scale-2 {
          fill: rgb(79 70 229);
        }
        .dark .react-calendar-heatmap .color-scale-3 {
          fill: rgb(99 102 241);
        }
        .dark .react-calendar-heatmap .color-scale-4 {
          fill: rgb(129 140 248);
        }

        /* Tooltip styling */
        .react-calendar-heatmap text {
          font-size: 10px;
          fill: rgb(107 114 128);
        }
        .dark .react-calendar-heatmap text {
          fill: rgb(156 163 175);
        }
      `}</style>
    </div>
  );
}
