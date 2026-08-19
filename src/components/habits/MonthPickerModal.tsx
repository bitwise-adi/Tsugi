'use client';

import { useState, useMemo } from 'react';
import {
  setYear,
  setMonth,
  getYear,
  isSameMonth,
  format,
} from 'date-fns';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import styles from './MonthPickerModal.module.css';

interface MonthPickerModalProps {
  currentMonth: Date;
  onSelectMonth: (date: Date) => void;
  onClose: () => void;
  entriesCountByMonth?: { [yearMonth: string]: number };
}

const MONTH_ABBRS = [
  'Jan', 'Feb', 'Mar', 'Apr',
  'May', 'Jun', 'Jul', 'Aug',
  'Sep', 'Oct', 'Nov', 'Dec',
];

export default function MonthPickerModal({
  currentMonth,
  onSelectMonth,
  onClose,
  entriesCountByMonth,
}: MonthPickerModalProps) {
  const [viewYear, setViewYear] = useState<number>(getYear(currentMonth));
  const today = useMemo(() => new Date(), []);

  const handleSelect = (monthIndex: number) => {
    const newDate = setMonth(setYear(new Date(), viewYear), monthIndex);
    onSelectMonth(newDate);
    onClose();
  };

  const handleGoToday = () => {
    onSelectMonth(today);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <CalendarIcon size={18} className={styles.headerIcon} />
            <h3 className={styles.title}>Select Month</h3>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close month picker">
            <X size={18} />
          </button>
        </div>

        {/* Year Navigator */}
        <div className={styles.yearBar}>
          <button
            className={styles.yearNavBtn}
            onClick={() => setViewYear(y => y - 1)}
            aria-label="Previous year"
            id="month-picker-prev-year"
          >
            <ChevronLeft size={20} />
          </button>
          <span className={styles.yearDisplay}>{viewYear}</span>
          <button
            className={styles.yearNavBtn}
            onClick={() => setViewYear(y => y + 1)}
            aria-label="Next year"
            id="month-picker-next-year"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 12-Month Exploded Grid */}
        <div className={styles.monthGrid}>
          {MONTH_ABBRS.map((abbr, index) => {
            const dateForMonth = setMonth(setYear(new Date(), viewYear), index);
            const isSelected = isSameMonth(dateForMonth, currentMonth);
            const isCurrentRealMonth = isSameMonth(dateForMonth, today);
            const ymKey = format(dateForMonth, 'yyyy-MM');
            const count = entriesCountByMonth ? entriesCountByMonth[ymKey] : undefined;

            return (
              <button
                key={abbr}
                className={`
                  ${styles.monthCard}
                  ${isSelected ? styles.monthSelected : ''}
                  ${isCurrentRealMonth && !isSelected ? styles.monthToday : ''}
                `}
                onClick={() => handleSelect(index)}
                id={`month-picker-option-${index}`}
              >
                <div className={styles.monthCardTop}>
                  <span className={styles.monthAbbr}>{abbr}</span>
                  {isCurrentRealMonth && <span className={styles.todayBadge}>Now</span>}
                </div>
                {count !== undefined && count > 0 && (
                  <span className={styles.countBadge}>{count} logged</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer with Quick Current Month Button */}
        <div className={styles.footer}>
          <button className={styles.jumpTodayBtn} onClick={handleGoToday} id="month-picker-jump-today">
            <Sparkles size={14} />
            Jump to Current Month ({format(today, 'MMM yyyy')})
          </button>
        </div>
      </div>
    </div>
  );
}
