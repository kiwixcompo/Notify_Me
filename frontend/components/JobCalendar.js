import { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

export default function JobCalendar({ onDateSelect, selectedDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [calendarData, setCalendarData] = useState({});
  const [loading, setLoading] = useState(false);
  const [filterByPreferences, setFilterByPreferences] = useState(true);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchCalendarData();
    // eslint-disable-next-line
  }, [currentMonth, currentYear, filterByPreferences]);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/jobs/calendar?month=${currentMonth}&year=${currentYear}&filterByPreferences=${filterByPreferences}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setCalendarData(response.data.calendarData || {});
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const formatDateForAPI = (day) => {
    // Always use the calendar's year, month, and day directly
    const yyyy = currentYear;
    const mm = String(currentMonth).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() + 1 &&
      currentYear === today.getFullYear()
    );
  };

  const isSelected = (day) => {
    if (!selectedDate) return false;
    const selected = new Date(selectedDate);
    return (
      day === selected.getDate() &&
      currentMonth === selected.getMonth() + 1 &&
      currentYear === selected.getFullYear()
    );
  };

  const handleDateClick = (day) => {
    const dateString = formatDateForAPI(day);
    onDateSelect(dateString);
  };

  const changeMonth = (direction) => {
    if (direction === 'prev') {
      if (currentMonth === 1) {
        setCurrentMonth(12);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 12) {
        setCurrentMonth(1);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = formatDateForAPI(day);
      const jobCount = calendarData[dateString] || 0;
      const hasJobs = jobCount > 0;

      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(day)}
          className={`p-2 text-center cursor-pointer border border-gray-200 transition-colors rounded-lg
            ${isToday(day) ? 'bg-blue-100 font-bold' : ''}
            ${isSelected(day) ? 'bg-blue-200 border-blue-400' : ''}
            ${hasJobs ? 'bg-green-50' : ''}`}
        >
          <div className="text-sm">{day}</div>
          {hasJobs && (
            <div className="text-xs text-green-600 font-bold">
              {jobCount} job{jobCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Job Calendar</h3>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={filterByPreferences}
            onChange={(e) => setFilterByPreferences(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-600">Filter by preferences</span>
        </label>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => changeMonth('prev')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-gray-800">
          {monthNames[currentMonth - 1]} {currentYear}
        </h2>
        <button
          onClick={() => changeMonth('next')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-semibold text-gray-600">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>
        </>
      )}

      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-100 border border-blue-300"></div>
          <span>Today</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-50 border border-green-200"></div>
          <span>Has jobs</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-200 border border-blue-400"></div>
          <span>Selected date</span>
        </div>
      </div>
    </div>
  );
} 