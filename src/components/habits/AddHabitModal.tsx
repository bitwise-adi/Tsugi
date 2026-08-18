'use client';

import { useState, useRef } from 'react';
import { X, Calendar, Repeat, Check } from 'lucide-react';
import type { Habit, HabitFrequency } from '@/types';
import styles from './AddHabitModal.module.css';

interface AddHabitModalProps {
  onClose: () => void;
  onAdd: (habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const FREQUENCIES: { value: HabitFrequency; label: string; description: string; tag?: string }[] = [
  { value: 'daily', label: 'Daily', description: 'Every day' },
  { value: 'weekly', label: 'Weekly', description: 'One day every 1, 2, or 3 weeks', tag: 'Cadence' },
  { value: 'monthly', label: 'Monthly', description: 'Once a month on a date', tag: 'Monthly' },
  { value: 'custom', label: 'Custom Days', description: 'Multiple days each week', tag: 'Multi-day' },
];

const COLORS = [
  '#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4',
  '#10b981', '#22c55e', '#eab308', '#f59e0b',
  '#ef4444', '#ec4899', '#a855f7', '#64748b',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const INTERVAL_OPTIONS = [
  { value: 1, label: 'Every week', desc: '1 week' },
  { value: 2, label: 'Every 2 weeks', desc: '2 weeks' },
  { value: 3, label: 'Every 3 weeks', desc: '3 weeks' },
];

export default function AddHabitModal({ onClose, onAdd }: AddHabitModalProps) {
  const today = new Date();
  const todayDateStr = today.toISOString().split('T')[0];
  const configSectionRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  
  // Weekly state (single day + 1/2/3 week interval)
  const [intervalWeeks, setIntervalWeeks] = useState<number>(1);
  const [weeklyDay, setWeeklyDay] = useState<number>(today.getDay());
  
  // Monthly state
  const [monthlyDay, setMonthlyDay] = useState<number>(today.getDate());
  
  // Custom days state (multiple days per week)
  const [customDays, setCustomDays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri
  
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  // Auto-scroll to configuration card whenever a non-daily frequency is chosen
  const handleFrequencyChange = (newFreq: HabitFrequency) => {
    setFrequency(newFreq);
    if (newFreq !== 'daily') {
      setTimeout(() => {
        configSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
    }
  };

  const toggleCustomDay = (day: number) => {
    setCustomDays(prev =>
      prev.includes(day) ? (prev.length > 1 ? prev.filter(d => d !== day) : prev) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let computedCustomDays: number[] | undefined;
    let computedInterval: number | undefined;

    if (frequency === 'weekly') {
      computedCustomDays = [weeklyDay];
      computedInterval = intervalWeeks;
    } else if (frequency === 'monthly') {
      computedCustomDays = [monthlyDay];
      computedInterval = undefined;
    } else if (frequency === 'custom') {
      computedCustomDays = customDays.length > 0 ? customDays : [1, 3, 5];
      computedInterval = 1;
    }

    setSaving(true);
    try {
      await onAdd({
        title: title.trim(),
        description: description.trim() || undefined,
        frequency: frequency === 'weekly' && intervalWeeks === 2 ? 'biweekly' : frequency,
        customDays: computedCustomDays,
        intervalWeeks: computedInterval,
        startDate: todayDateStr,
        color,
      });
    } finally {
      setSaving(false);
    }
  };

  // Schedule summary description generator (clean, no AI icons)
  const getSummaryText = () => {
    if (frequency === 'daily') return 'Repeats every day';
    if (frequency === 'weekly') {
      const dayName = DAY_LABELS[weeklyDay];
      const intervalText = intervalWeeks === 1 ? 'every week' : `every ${intervalWeeks} weeks`;
      return `Repeats ${intervalText} on ${dayName}`;
    }
    if (frequency === 'monthly') {
      const suffix = ['th', 'st', 'nd', 'rd'][(monthlyDay % 100 > 10 && monthlyDay % 100 < 14) ? 0 : (monthlyDay % 10 < 4 ? monthlyDay % 10 : 0)];
      return `Repeats once a month on the ${monthlyDay}${suffix}`;
    }
    if (frequency === 'custom') {
      const daysText = customDays.map(d => DAY_LABELS[d]).join(', ');
      return `Repeats every week on ${daysText}`;
    }
    return '';
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
              placeholder="e.g., Haircut, Go to gym, Read 30 mins..."
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

          {/* Frequency Selector */}
          <div className={styles.field}>
            <label className={styles.label}>Frequency</label>
            <div className={styles.frequencyGrid}>
              {FREQUENCIES.map(f => (
                <button
                  key={f.value}
                  type="button"
                  className={`${styles.frequencyBtn} ${frequency === f.value ? styles.frequencyActive : ''}`}
                  onClick={() => handleFrequencyChange(f.value)}
                  id={`freq-${f.value}`}
                >
                  <div className={styles.freqTopRow}>
                    <span className={styles.freqLabel}>{f.label}</span>
                    {f.tag && frequency === f.value && (
                      <span className={styles.freqBadge}>Configuring ▾</span>
                    )}
                  </div>
                  <span className={styles.freqDesc}>{f.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* --- Prominent Schedule Configuration Card --- */}
          {frequency !== 'daily' && (
            <div className={styles.configContainer} ref={configSectionRef}>
              <div className={styles.configHeader}>
                <div className={styles.configTitleRow}>
                  <Calendar size={16} className={styles.configIcon} />
                  <h3 className={styles.configTitle}>Schedule Details</h3>
                </div>
                <span className={styles.configSubtitle}>Set your preferred repeat pattern</span>
              </div>

              {/* Weekly Configuration: 1 day + 1/2/3 week interval */}
              {frequency === 'weekly' && (
                <div className={styles.configBody}>
                  {/* Step 1: Interval */}
                  <div className={styles.configSubSection}>
                    <label className={styles.configSubLabel}>
                      <Repeat size={14} />
                      How often should it repeat?
                    </label>
                    <div className={styles.intervalGridThree}>
                      {INTERVAL_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`${styles.intervalBtn} ${intervalWeeks === opt.value ? styles.intervalActive : ''}`}
                          onClick={() => setIntervalWeeks(opt.value)}
                          id={`interval-w-${opt.value}`}
                        >
                          <span className={styles.intervalTitle}>{opt.label}</span>
                          <span className={styles.intervalDesc}>{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Single Day Selection */}
                  <div className={styles.configSubSection}>
                    <label className={styles.configSubLabel}>
                      <Calendar size={14} />
                      Which day of the week?
                    </label>
                    <div className={styles.daysRow}>
                      {DAY_LABELS.map((label, i) => {
                        const isSelected = weeklyDay === i;
                        return (
                          <button
                            key={i}
                            type="button"
                            className={`${styles.dayBtn} ${isSelected ? styles.dayActive : ''}`}
                            onClick={() => setWeeklyDay(i)}
                            id={`weekly-day-${i}`}
                          >
                            <span className={styles.dayBtnText}>{label}</span>
                            {isSelected && <Check size={10} className={styles.dayCheck} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly Configuration */}
              {frequency === 'monthly' && (
                <div className={styles.configBody}>
                  <div className={styles.configSubSection}>
                    <label className={styles.configSubLabel}>
                      <Calendar size={14} />
                      Which day of the month?
                    </label>
                    <div className={styles.monthlyQuickRow}>
                      {[1, 15, today.getDate(), 28].filter((v, i, a) => a.indexOf(v) === i).map((d) => (
                        <button
                          key={d}
                          type="button"
                          className={`${styles.quickMonthBtn} ${monthlyDay === d ? styles.dayActive : ''}`}
                          onClick={() => setMonthlyDay(d)}
                        >
                          {d === 1 ? '1st' : d === 15 ? '15th' : d === today.getDate() ? `Today (${d})` : `${d}th`}
                        </button>
                      ))}
                    </div>
                    <div className={styles.monthlyPickerWrapper}>
                      <span className={styles.subLabel}>Or exact day (1–31):</span>
                      <input
                        id="monthly-day-input"
                        type="number"
                        min={1}
                        max={31}
                        value={monthlyDay}
                        onChange={e => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v) && v >= 1 && v <= 31) setMonthlyDay(v);
                        }}
                        className={styles.numberInput}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Days Configuration: Multi-day in week */}
              {frequency === 'custom' && (
                <div className={styles.configBody}>
                  <div className={styles.configSubSection}>
                    <label className={styles.configSubLabel}>
                      <Calendar size={14} />
                      Select Days in the Week
                    </label>
                    <div className={styles.presetRow}>
                      <button
                        type="button"
                        className={styles.presetBtn}
                        onClick={() => setCustomDays([1, 2, 3, 4, 5])}
                      >
                        Weekdays (M-F)
                      </button>
                      <button
                        type="button"
                        className={styles.presetBtn}
                        onClick={() => setCustomDays([0, 6])}
                      >
                        Weekends (S-S)
                      </button>
                      <button
                        type="button"
                        className={styles.presetBtn}
                        onClick={() => setCustomDays([1, 3, 5])}
                      >
                        Mon/Wed/Fri
                      </button>
                    </div>
                    <div className={styles.daysRow}>
                      {DAY_LABELS.map((label, i) => {
                        const isSelected = customDays.includes(i);
                        return (
                          <button
                            key={i}
                            type="button"
                            className={`${styles.dayBtn} ${isSelected ? styles.dayActive : ''}`}
                            onClick={() => toggleCustomDay(i)}
                            id={`custom-day-${i}`}
                          >
                            <span className={styles.dayBtnText}>{label}</span>
                            {isSelected && <Check size={10} className={styles.dayCheck} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Clean Live Summary Banner (No AI Sparkles) */}
              <div className={styles.summaryBanner}>
                <span className={styles.summaryBullet}>•</span>
                <span className={styles.summaryText}>{getSummaryText()}</span>
              </div>
            </div>
          )}

          {/* Color Picker */}
          <div className={styles.field}>
            <label className={styles.label}>Theme Color</label>
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
