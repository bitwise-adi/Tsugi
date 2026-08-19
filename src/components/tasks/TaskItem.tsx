'use client';

import { useState } from 'react';
import {
  Check,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Minus,
  ArrowDown,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { getTodayString } from '@/hooks/useTasks';
import type { Task, TaskPriority } from '@/types';
import styles from './TaskItem.module.css';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; icon: typeof AlertCircle; className: string }> = {
  high: { label: 'High', icon: AlertCircle, className: 'priorityHigh' },
  medium: { label: 'Med', icon: Minus, className: 'priorityMedium' },
  low: { label: 'Low', icon: ArrowDown, className: 'priorityLow' },
};

export default function TaskItem({ task, onToggle, onDelete, onUpdate }: TaskItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [noteText, setNoteText] = useState(task.note || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const priorityInfo = PRIORITY_CONFIG[task.priority];
  const PriorityIcon = priorityInfo.icon;

  const handleSaveNote = () => {
    onUpdate(task.id, { note: noteText.trim() || undefined });
  };

  return (
    <div
      className={`${styles.item} ${task.completed ? styles.completed : ''}`}
      id={`task-item-${task.id}`}
    >
      <div className={styles.mainRow}>
        {/* Checkbox */}
        <button
          className={`${styles.checkbox} ${task.completed ? styles.checked : ''}`}
          onClick={() => onToggle(task.id)}
          aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
          id={`task-toggle-${task.id}`}
        >
          {task.completed && <Check size={14} strokeWidth={3} />}
        </button>

        {/* Task Info */}
        <div className={styles.info} onClick={() => setExpanded(!expanded)}>
          <div className={styles.titleRow}>
            <span className={styles.title}>{task.title}</span>
            <div className={styles.badges}>
              {/* Priority Badge */}
              <span className={`${styles.priorityBadge} ${styles[priorityInfo.className]}`}>
                <PriorityIcon size={12} />
                {priorityInfo.label}
              </span>
              {/* Time Badge */}
              {task.time && (
                <span className={styles.timeBadge}>
                  <Clock size={12} />
                  {task.time}
                </span>
              )}
              {/* Due Date Badge */}
              {task.dueDate && (
                <span className={`${styles.dueDateBadge} ${task.dueDate < getTodayString() && !task.completed ? styles.overdueBadge : ''}`}>
                  <Calendar size={11} />
                  Due {format(new Date(task.dueDate + 'T00:00:00'), 'MMM d')}
                </span>
              )}
            </div>
          </div>
          {task.description && (
            <p className={styles.description}>{task.description}</p>
          )}
        </div>

        {/* Expand/Collapse */}
        <button
          className={styles.expandBtn}
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className={styles.details}>
          {/* Note */}
          <div className={styles.noteSection}>
            <textarea
              className={styles.noteInput}
              placeholder="Add a note..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={2}
              id={`task-note-${task.id}`}
            />
            {noteText !== (task.note || '') && (
              <button
                className={styles.saveNoteBtn}
                onClick={handleSaveNote}
                id={`save-task-note-${task.id}`}
              >
                Save
              </button>
            )}
          </div>

          {/* Delete */}
          <div className={styles.actions}>
            {!showDeleteConfirm ? (
              <button
                className={styles.deleteBtn}
                onClick={() => setShowDeleteConfirm(true)}
                id={`task-delete-trigger-${task.id}`}
              >
                <Trash2 size={14} />
                Delete Task
              </button>
            ) : (
              <div className={styles.deleteConfirm}>
                <span className={styles.deleteConfirmText}>Delete this task?</span>
                <button
                  className={styles.confirmYes}
                  onClick={() => onDelete(task.id)}
                  id={`task-confirm-delete-${task.id}`}
                >
                  Yes, Delete
                </button>
                <button
                  className={styles.confirmNo}
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
