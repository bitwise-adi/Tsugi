'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { Habit, HabitFrequency } from '@/types';
import styles from './AddHabitModal.module.css';

interface AddHabitModalProps {
  onClose: () => void;
  onAdd: (habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const FREQUENCIES: { value: HabitFrequency; label: string; description: string }[] = [
  { value: 'daily', label: 'Daily', description: 'Every day' },
  { value: 'weekly', label: 'Weekly', description: 'Once a week' },
  { value: 'biweekly', label: 'Biweekly', description: 'Every two weeks' },
  { value: 'monthly', label: 'Monthly', description: 'Once a month' },
  { value: 'custom', label: 'Custom', description: 'Pick specific days' },
];

const COLORS = [
  '#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4',
  '#10b981', '#22c55e', '#eab308', '#f59e0b',
  '#ef4444', '#ec4899', '#a855f7', '#64748b',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AddHabitModal({ onClose, onAdd }: AddHabitModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      await onAdd({
        title: title.trim(),
        description: description.trim() || undefined,
        frequency,
        customDays: frequency === 'custom' ? customDays : undefined,
        color,
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleCustomDay = (day: number) => {
    setCustomDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>New Habit</h2>
          <button className={styles.closeBtn} onClick={onClose} id="close-add-habit-modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Title */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="habit-title">Title</label>
            <input
              id="habit-title"
              type="text"
              className={styles.input}
              placeholder="e.g., Go to gym, Read 30 mins..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="habit-description">Description (optional)</label>
            <textarea
              id="habit-description"
              className={styles.textarea}
              placeholder="What does this habit involve?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Frequency */}
          <div className={styles.field}>
            <label className={styles.label}>Frequency</label>
            <div className={styles.frequencyGrid}>
              {FREQUENCIES.map(f => (
                <button
                  key={f.value}
                  type="button"
                  className={`${styles.frequencyBtn} ${frequency === f.value ? styles.frequencyActive : ''}`}
                  onClick={() => setFrequency(f.value)}
                  id={`freq-${f.value}`}
                >
                  <span className={styles.freqLabel}>{f.label}</span>
                  <span className={styles.freqDesc}>{f.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Days */}
          {frequency === 'custom' && (
            <div className={styles.field}>
              <label className={styles.label}>Select Days</label>
              <div className={styles.daysRow}>
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`${styles.dayBtn} ${customDays.includes(i) ? styles.dayActive : ''}`}
                    onClick={() => toggleCustomDay(i)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color */}
          <div className={styles.field}>
            <label className={styles.label}>Color</label>
            <div className={styles.colorGrid}>
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.colorBtn} ${color === c ? styles.colorActive : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={!title.trim() || saving}
            id="submit-add-habit"
          >
            {saving ? 'Creating...' : 'Create Habit'}
          </button>
        </form>
      </div>
    </div>
  );
}
