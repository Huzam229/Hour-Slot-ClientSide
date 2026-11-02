'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import styles from './CustomDatePicker.module.css';

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  min?: string; // YYYY-MM-DD
  placeholder?: string;
  id?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function CustomDatePicker({
  value,
  onChange,
  min,
  placeholder = 'Pick a date',
  id,
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize display month to selected date or current date
  const [currentDate, setCurrentDate] = useState(() => {
    if (value) return new Date(value);
    if (min) return new Date(min);
    return new Date();
  });

  useEffect(() => {
    if (value) {
      setCurrentDate(new Date(value));
    }
  }, [value]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calendar cells generation
  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const result: { dayNum: number | null; dateString: string; isDisabled: boolean }[] = [];

    // Padding for first week
    for (let i = 0; i < firstDay; i++) {
      result.push({ dayNum: null, dateString: '', isDisabled: true });
    }

    // Days of month
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const cellDate = new Date(year, month, d);
      
      let isDisabled = false;
      if (min) {
        const minDate = new Date(min);
        minDate.setHours(0, 0, 0, 0);
        cellDate.setHours(0, 0, 0, 0);
        isDisabled = cellDate < minDate;
      }

      result.push({ dayNum: d, dateString: dateStr, isDisabled });
    }

    return result;
  }, [year, month, min]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleSelectDate = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  const formattedValue = useMemo(() => {
    if (!value) return '';
    const dateObj = new Date(value);
    return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }, [value]);

  return (
    <div ref={containerRef} className={styles.datePickerContainer} id={id}>
      <button
        type="button"
        className={styles.triggerButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className={styles.triggerLabel}>
          <i className={`fa-regular fa-calendar ${styles.calendarIcon}`} />
          {value ? formattedValue : <span className={styles.placeholder}>{placeholder}</span>}
        </span>
        <i className={`fa-solid fa-chevron-down ${styles.chevron}`} />
      </button>

      {isOpen && (
        <div className={styles.popoverMenu}>
          <div className={styles.calendarHeader}>
            <button
              type="button"
              className={styles.navButton}
              onClick={handlePrevMonth}
              aria-label="Previous month"
            >
              <i className="fa-solid fa-chevron-left" />
            </button>
            <div className={styles.monthLabel}>
              {MONTH_NAMES[month]} {year}
            </div>
            <button
              type="button"
              className={styles.navButton}
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              <i className="fa-solid fa-chevron-right" />
            </button>
          </div>

          <div className={styles.calendarGrid}>
            {WEEKDAY_NAMES.map((name) => (
              <span key={name} className={styles.weekdayName}>
                {name}
              </span>
            ))}

            {cells.map((cell, idx) => {
              if (cell.dayNum === null) {
                return <span key={`empty-${idx}`} className={styles.emptyCell} />;
              }

              const isSelected = cell.dateString === value;

              return (
                <button
                  key={cell.dateString}
                  type="button"
                  className={`${styles.dayButton} ${isSelected ? styles.selectedDay : ''} ${cell.isDisabled ? styles.disabledDay : ''}`}
                  disabled={cell.isDisabled}
                  onClick={() => handleSelectDate(cell.dateString)}
                >
                  {cell.dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
