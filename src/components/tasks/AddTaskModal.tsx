'use client';

import { useState } from 'react';
import { X, Calendar, Clock, Flag, Target } from 'lucide-react';
import { format, addDays } from 'date-fns';
import type { Task, TaskPriority } from '@/types';
import styles from './AddTaskModal.module.css';

interface AddTaskModalProps {
  onClose: () => void;
  onAdd: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  initialDate?: string;
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; emoji: string }[] = [
  { value: 'low', label: 'Low', emoji: '🟢' },
  { value: 'medium', label: 'Medium', emoji: '🟡' },
  { value: 'high', label: 'High', emoji: '🔴' },
];

const QUICK_DATES = [
  { label: 'Today', getDate: () => format(new Date(), 'yyyy-MM-dd') },
  { label: 'Tomorrow', getDate: () => format(addDays(new Date(), 1), 'yyyy-MM-dd') },
  { label: 'In 3 days', getDate: () => format(addDays(new Date(), 3), 'yyyy-MM-dd') },
  { label: 'Next week', getDate: () => format(addDays(new Date(), 7), 'yyyy-MM-dd') },
];

export default function AddTaskModal({ onClose, onAdd, initialDate }: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState('');
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      await onAdd({
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        dueDate: dueDate || undefined,
        time: time || undefined,
        completed: false,
        priority,
        reminderEnabled,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>New Task</h2>
          <button className={styles.closeBtn} onClick={onClose} id="close-add-task-modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Title */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="task-title">What do you need to do?</label>
            <input
              id="task-title"
              type="text"
              className={styles.input}
              placeholder="e.g., Submit report, Call dentist..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="task-description">Details (optional)</label>
            <textarea
              id="task-description"
              className={styles.textarea}
              placeholder="Any extra details..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Scheduled Date */}
          <div className={styles.field}>
            <label className={styles.label}>
              <Calendar size={14} />
              Scheduled Date
            </label>
            <div className={styles.quickDates}>
              {QUICK_DATES.map(qd => {
                const qdVal = qd.getDate();
                return (
                  <button
                    key={qd.label}
                    type="button"
                    className={`${styles.quickDateBtn} ${date === qdVal ? styles.quickDateActive : ''}`}
                    onClick={() => setDate(qdVal)}
                  >
                    {qd.label}
                  </button>
                );
              })}
            </div>
            <input
              type="date"
              className={styles.dateInput}
              value={date}
              onChange={e => setDate(e.target.value)}
              id="task-date-input"
            />
          </div>

          {/* Due Date (Optional) */}
          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label className={styles.label} htmlFor="task-due-date">
                <Target size={14} />
                Due Date (optional)
              </label>
              {dueDate && (
                <button
                  type="button"
                  className={styles.clearTimeBtn}
                  onClick={() => setDueDate('')}
                >
                  Clear due date
                </button>
              )}
            </div>
            <div className={styles.quickDates}>
              {QUICK_DATES.map(qd => {
                const qdVal = qd.getDate();
                return (
                  <button
                    key={`due-${qd.label}`}
                    type="button"
                    className={`${styles.quickDateBtn} ${dueDate === qdVal ? styles.quickDateActive : ''}`}
                    onClick={() => setDueDate(qdVal)}
                  >
                    {qd.label}
                  </button>
                );
              })}
            </div>
            <input
              type="date"
              className={styles.dateInput}
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              id="task-due-date"
            />
          </div>

          {/* Time */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="task-time">
              <Clock size={14} />
              Time (optional)
            </label>
            <input
              id="task-time"
              type="time"
              className={styles.timeInput}
              value={time}
              onChange={e => setTime(e.target.value)}
            />
            {time && (
              <button
                type="button"
                className={styles.clearTimeBtn}
                onClick={() => setTime('')}
              >
                Clear time
              </button>
            )}
          </div>

          {/* Priority */}
          <div className={styles.field}>
            <label className={styles.label}>
              <Flag size={14} />
              Priority
            </label>
            <div className={styles.priorityGrid}>
              {PRIORITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.priorityBtn} ${priority === opt.value ? styles.priorityActive : ''}`}
                  onClick={() => setPriority(opt.value)}
                  id={`priority-${opt.value}`}
                >
                  <span className={styles.priorityEmoji}>{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reminder Toggle */}
          {time && (
            <div className={styles.field}>
              <label className={styles.toggleRow}>
                <span className={styles.toggleLabel}>
                  <Clock size={14} />
                  Remind me at this time
                </span>
                <button
                  type="button"
                  className={`${styles.toggle} ${reminderEnabled ? styles.toggleOn : ''}`}
                  onClick={() => setReminderEnabled(!reminderEnabled)}
                  role="switch"
                  aria-checked={reminderEnabled}
                  id="task-reminder-toggle"
                >
                  <span className={styles.toggleThumb} />
                </button>
              </label>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={!title.trim() || saving}
            id="submit-add-task"
          >
            {saving ? 'Adding...' : 'Add Task'}
          </button>
        </form>
      </div>
    </div>
  );
}
