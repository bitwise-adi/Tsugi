'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useTasks, usePendingTasksSummary, getTodayString } from '@/hooks/useTasks';
import TaskItem from '@/components/tasks/TaskItem';
import AddTaskModal from '@/components/tasks/AddTaskModal';
import {
  Plus,
  ListTodo,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { format, addDays, subDays, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import styles from './page.module.css';

function formatDateHeading(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEE, MMM d');
}

export default function TasksPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const { tasks, loading, addTask, toggleComplete, deleteTask, updateTask } =
    useTasks(selectedDate);
  const {
    taskSummaryByDate,
    pastPendingCount,
    pastPendingDates,
    upcomingPendingCount,
    upcomingPendingDates,
  } = usePendingTasksSummary();
  const [showAddModal, setShowAddModal] = useState(false);

  const activeDayRef = useRef<HTMLButtonElement>(null);

  const completedCount = useMemo(
    () => tasks.filter((t) => t.completed).length,
    [tasks]
  );
  const totalCount = tasks.length;
  const pendingCount = totalCount - completedCount;

  const goToday = () => setSelectedDate(getTodayString());
  const goPrev = () =>
    setSelectedDate((d) => format(subDays(parseISO(d), 1), 'yyyy-MM-dd'));
  const goNext = () =>
    setSelectedDate((d) => format(addDays(parseISO(d), 1), 'yyyy-MM-dd'));

  const isCurrentlyToday = isToday(parseISO(selectedDate));
  const isPastDate = selectedDate < getTodayString();

  // Scrollable timeline strip: 36 days (-21 days past to +14 days future)
  const dayStrip = useMemo(() => {
    const todayObj = parseISO(getTodayString());
    const offsets = Array.from({ length: 36 }, (_, i) => i - 21);
    return offsets.map(offset => {
      const d = offset >= 0 ? addDays(todayObj, offset) : subDays(todayObj, Math.abs(offset));
      const dateStr = format(d, 'yyyy-MM-dd');
      const isSelected = dateStr === selectedDate;
      const today = isToday(d);
      const summary = taskSummaryByDate[dateStr];
      const isPast = dateStr < getTodayString();
      return {
        dateStr,
        dayName: format(d, 'EEE'),
        dayNumber: format(d, 'd'),
        isSelected,
        isToday: today,
        isPast,
        total: summary?.total || 0,
        pending: summary?.pending || 0,
        completed: summary?.completed || 0,
      };
    });
  }, [selectedDate, taskSummaryByDate]);

  // Center the active selected day in view
  useEffect(() => {
    if (activeDayRef.current) {
      activeDayRef.current.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedDate]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>
            <ListTodo size={28} className={styles.titleIcon} />
            Tasks
          </h1>
          {!isCurrentlyToday && (
            <button
              className={styles.todayBtn}
              onClick={goToday}
              id="tasks-go-today"
            >
              <CalendarDays size={14} />
              Today
            </button>
          )}
        </div>
        <p className={styles.subtitle}>
          {totalCount === 0
            ? 'No tasks for this day'
            : isCurrentlyToday
            ? pendingCount === 0
              ? `All ${totalCount} task${totalCount === 1 ? '' : 's'} completed today! 🎉`
              : `${completedCount}/${totalCount} completed • ${pendingCount} remaining today`
            : isPastDate
            ? pendingCount > 0
              ? `${pendingCount} pending task${pendingCount > 1 ? 's' : ''} from past day (${completedCount}/${totalCount} completed)`
              : `All ${totalCount} tasks completed (${completedCount}/${totalCount})`
            : `${completedCount}/${totalCount} completed • ${pendingCount} pending`}
        </p>
      </header>

      {/* Past Pending Tasks Alert Banner */}
      {pastPendingCount > 0 && (
        <div className={styles.pastPendingBanner}>
          <div className={styles.pastPendingTop}>
            <div className={styles.pastPendingTitleRow}>
              <AlertCircle size={16} className={styles.alertIcon} />
              <span className={styles.pastPendingTitle}>
                <strong>{pastPendingCount}</strong> incomplete task{pastPendingCount > 1 ? 's' : ''} from previous days
              </span>
            </div>
          </div>
          <div className={styles.pastPendingChips}>
            {pastPendingDates.map(item => (
              <button
                key={item.date}
                className={`${styles.pastDateChip} ${selectedDate === item.date ? styles.pastDateChipActive : ''}`}
                onClick={() => setSelectedDate(item.date)}
                id={`jump-past-task-${item.date}`}
              >
                <span>{formatDateHeading(item.date)}</span>
                <span className={styles.pastChipCount}>{item.pendingCount}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Today & Upcoming Pending Tasks Banner */}
      {upcomingPendingCount > 0 && (
        <div className={styles.upcomingPendingBanner}>
          <div className={styles.pastPendingTop}>
            <div className={styles.pastPendingTitleRow}>
              <Clock size={16} className={styles.upcomingIcon} />
              <span className={styles.pastPendingTitle}>
                <strong>{upcomingPendingCount}</strong> pending task{upcomingPendingCount > 1 ? 's' : ''} for today & upcoming days
              </span>
            </div>
          </div>
          <div className={styles.pastPendingChips}>
            {upcomingPendingDates.map(item => (
              <button
                key={item.date}
                className={`${styles.upcomingDateChip} ${selectedDate === item.date ? styles.upcomingDateChipActive : ''}`}
                onClick={() => setSelectedDate(item.date)}
                id={`jump-upcoming-task-${item.date}`}
              >
                <span>{formatDateHeading(item.date)}</span>
                <span className={styles.upcomingChipCount}>{item.pendingCount}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date Nav */}
      <div className={styles.dateNav}>
        <button
          className={styles.dateNavBtn}
          onClick={goPrev}
          aria-label="Previous day"
          id="tasks-prev-day"
        >
          <ChevronLeft size={20} />
        </button>
        <span className={styles.dateLabel}>
          {formatDateHeading(selectedDate)}
          <span className={styles.dateSubLabel}>
            {format(parseISO(selectedDate), 'MMMM d, yyyy')}
          </span>
        </span>
        <button
          className={styles.dateNavBtn}
          onClick={goNext}
          aria-label="Next day"
          id="tasks-next-day"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Scrollable Day Strip */}
      <div className={styles.dayStripContainer}>
        <div className={styles.dayStrip}>
          {dayStrip.map(day => (
            <button
              key={day.dateStr}
              ref={day.isSelected ? activeDayRef : null}
              className={`
                ${styles.dayStripPill}
                ${day.isSelected ? styles.dayStripActive : ''}
                ${day.isToday ? styles.dayStripToday : ''}
              `}
              onClick={() => setSelectedDate(day.dateStr)}
              id={`day-strip-${day.dateStr}`}
            >
              <span className={styles.dayStripName}>{day.dayName}</span>
              <span className={styles.dayStripNum}>{day.dayNumber}</span>
              <div className={styles.dayStripIndicator}>
                {day.total > 0 && day.pending === 0 && (
                  <span className={styles.dotDone} title="All tasks completed" />
                )}
                {day.total > 0 && day.pending > 0 && (
                  <span className={styles.dotPending} title={`${day.pending} pending task${day.pending > 1 ? 's' : ''}`}>
                    {day.pending > 9 ? '9+' : day.pending}
                  </span>
                )}
                {day.total === 0 && <span className={styles.dotEmpty} />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingPulse} />
            <p>Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <h2 className={styles.emptyTitle}>No tasks</h2>
            <p className={styles.emptyText}>
              Nothing scheduled for {formatDateHeading(selectedDate).toLowerCase()}.
              Tap the button below to add one!
            </p>
            <button
              className={styles.emptyButton}
              onClick={() => setShowAddModal(true)}
              id="add-first-task-btn"
            >
              <Plus size={20} />
              Add a Task
            </button>
          </div>
        ) : (
          <div className={styles.taskList}>
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className={styles.taskCardWrapper}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TaskItem
                  task={task}
                  onToggle={toggleComplete}
                  onDelete={deleteTask}
                  onUpdate={updateTask}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      {totalCount > 0 && (
        <button
          className={styles.fab}
          onClick={() => setShowAddModal(true)}
          id="add-task-fab"
          aria-label="Add new task"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <AddTaskModal
          onClose={() => setShowAddModal(false)}
          initialDate={selectedDate}
          onAdd={async (taskData) => {
            await addTask(taskData);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}
