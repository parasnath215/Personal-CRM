import { useState, useEffect } from 'react';
import api from '../api';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw } from 'lucide-react';

export default function CalendarWidget({ selectedDate, onSelectDate, refreshTrigger }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [summaryData, setSummaryData] = useState({});
  const [loadingSummary, setLoadingSummary] = useState(false);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth(); // 0-indexed

  // Fetch summary counts for the current month
  const fetchSummary = async () => {
    try {
      setLoadingSummary(true);
      const res = await api.get(`/api/tasks/calendar-summary?year=${year}&month=${month + 1}`);
      setSummaryData(res.data || {});
    } catch (err) {
      console.error('Failed to fetch calendar summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [year, month, refreshTrigger]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const handleResetToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    onSelectDate(today);
  };

  // Calendar math
  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon...
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const daysArray = [];

  // Previous month trailing days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const dateObj = new Date(year, month - 1, dayNum);
    daysArray.push({
      date: dateObj,
      dayNum,
      isCurrentMonth: false,
      dateStr: dateObj.toISOString().split('T')[0]
    });
  }

  // Current month days
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const dateObj = new Date(year, month, dayNum);
    // Format YYYY-MM-DD local string
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    daysArray.push({
      date: dateObj,
      dayNum,
      isCurrentMonth: true,
      dateStr
    });
  }

  // Next month leading days to fill 35 or 42 grid cells
  const totalGridCells = daysArray.length > 35 ? 42 : 35;
  const remainingCells = totalGridCells - daysArray.length;
  for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
    const dateObj = new Date(year, month + 1, dayNum);
    const dateStr = dateObj.toISOString().split('T')[0];
    daysArray.push({
      date: dateObj,
      dayNum,
      isCurrentMonth: false,
      dateStr
    });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const selectedStr = selectedDate ? new Date(selectedDate).toISOString().split('T')[0] : todayStr;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-lg">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white leading-snug">
              {monthNames[month]} {year}
            </h3>
            <p className="text-xs text-slate-400">Click a day to manage tasks</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleResetToday}
            className="p-1.5 bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors mr-1"
            title="Go to Today"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Today
          </button>

          <button
            onClick={handlePrevMonth}
            className="p-1.5 bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleNextMonth}
            className="p-1.5 bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 text-center mb-2">
        {weekDays.map(day => (
          <span key={day} className="text-xs font-semibold text-slate-400 uppercase py-1">
            {day}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 flex-1">
        {daysArray.map((cell, idx) => {
          const isSelected = cell.dateStr === selectedStr;
          const isToday = cell.dateStr === todayStr;
          const summary = summaryData[cell.dateStr];

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(cell.date)}
              className={`relative flex flex-col items-center justify-between p-2 rounded-lg text-sm transition-all duration-150 aspect-square ${
                isSelected
                  ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-400 shadow-md shadow-blue-900/40'
                  : isToday
                  ? 'bg-slate-700/90 text-blue-400 font-bold border border-blue-500/50'
                  : cell.isCurrentMonth
                  ? 'bg-slate-700/30 text-slate-200 hover:bg-slate-700/70 hover:text-white'
                  : 'bg-slate-800/40 text-slate-600 hover:bg-slate-700/20'
              }`}
            >
              <span className="text-xs">{cell.dayNum}</span>

              {/* Status Indicator Dots */}
              {summary && (
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  {summary.pending > 0 && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-amber-300' : 'bg-amber-400'
                      }`}
                      title={`${summary.pending} pending task(s)`}
                    />
                  )}
                  {summary.done > 0 && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-emerald-300' : 'bg-emerald-400'
                      }`}
                      title={`${summary.done} completed task(s)`}
                    />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/60 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Pending
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Done
          </span>
        </div>
        <span className="text-slate-500 text-[11px]">Select date to view/add tasks</span>
      </div>
    </div>
  );
}
