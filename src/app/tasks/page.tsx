'use client';

import { useState, useMemo } from 'react';
import { useTasks, getTodayString } from '@/hooks/useTasks';
import TaskItem from '@/components/tasks/TaskItem';
import AddTaskModal from '@/components/tasks/AddTaskModal';
import {
  Plus,
  ListTodo,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
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
  const [showAddModal, setShowAddModal] = useState(false);

  const completedCount = useMemo(
    () => tasks.filter((t) => t.completed).length,
    [tasks]
  );
  const totalCount = tasks.length;

  const goToday = () => setSelectedDate(getTodayString());
  const goPrev = () =>
    setSelectedDate((d) => format(subDays(parseISO(d), 1), 'yyyy-MM-dd'));
  const goNext = () =>
    setSelectedDate((d) => format(addDays(parseISO(d), 1), 'yyyy-MM-dd'));

  const isCurrentlyToday = isToday(parseISO(selectedDate));

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
            : `${completedCount}/${totalCount} completed`}
        </p>
      </header>

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
