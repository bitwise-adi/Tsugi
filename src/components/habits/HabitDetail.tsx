'use client';

import { useState, useMemo } from 'react';
import HabitHeatmap from './HabitHeatmap';
import HabitChart from './HabitChart';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isToday,
  isFuture,
  isSameMonth,
} from 'date-fns';
import { useHabitEntries, calculateStreak } from '@/hooks/useHabits';
import { useAuth } from '@/components/AuthProvider';
import ShareHabitModal from './ShareHabitModal';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  AlertTriangle,
  Flame,
  TrendingUp,
  Trophy,
  Hash,
  Trash2,
  MessageSquare,
  Share2,
  FileText,
  StickyNote,
} from 'lucide-react';
import type { Habit, HabitStatus } from '@/types';
import { isHabitScheduledOnDate } from '@/lib/schedule';
import styles from './HabitDetail.module.css';

interface HabitDetailProps {
  habit: Habit;
  onBack: () => void;
  onDelete: () => void;
}

const STATUS_OPTIONS: { value: HabitStatus; label: string; icon: typeof Check; color: string }[] = [
  { value: 'done', label: 'Done', icon: Check, color: 'var(--color-done)' },
  { value: 'missed', label: 'Missed', icon: X, color: 'var(--color-missed)' },
  { value: 'excused', label: 'Valid Reason', icon: AlertTriangle, color: 'var(--color-excused)' },
];

export default function HabitDetail({ habit, onBack, onDelete }: HabitDetailProps) {
  const { entries, setEntry, updateNote, getEntryForDate } = useHabitEntries(habit.id);
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const stats = useMemo(() => calculateStreak(entries, habit), [entries, habit]);

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const handleDateClick = (dateStr: string, dayDate: Date) => {
    if (isFuture(dayDate) && !isToday(dayDate)) return;
    setSelectedDate(selectedDate === dateStr ? null : dateStr);
    const existing = getEntryForDate(dateStr);
    setNoteText(existing?.note || '');
    setShowNoteInput(!!existing?.note);
  };

  const handleSetStatus = async (status: HabitStatus) => {
    if (!selectedDate) return;
    await setEntry(selectedDate, status, noteText || undefined);
  };

  const handleSaveNote = async () => {
    if (!selectedDate) return;
    await updateNote(selectedDate, noteText);
    setSelectedDate(null);
  };

  // "Done" button handler — saves note if present, then closes popup
  const handleDone = async () => {
    if (!selectedDate) return;
    // If user typed a note, save it
    if (noteText.trim()) {
      await updateNote(selectedDate, noteText);
    }
    setSelectedDate(null);
  };

  const selectedEntry = selectedDate ? getEntryForDate(selectedDate) : null;
  const isSelectedDateScheduled = selectedDate ? isHabitScheduledOnDate(habit, selectedDate) : true;

  // Notes in the currently displayed month
  const monthNotes = useMemo(() => {
    return entries
      .filter(e => e.note && e.note.trim().length > 0 && isSameMonth(new Date(e.date + 'T00:00:00'), currentMonth))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, currentMonth]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} id="habit-detail-back">
          <ArrowLeft size={20} />
        </button>
        <div className={styles.headerInfo}>
          <div className={styles.titleRow}>
            <div className={styles.colorDot} style={{ background: habit.color }} />
            <h1 className={styles.title}>{habit.title}</h1>
          </div>
          {habit.description && (
            <p className={styles.description}>{habit.description}</p>
          )}
        </div>
        <div className={styles.headerActions}>
          {user && (
            <button
              className={styles.shareBtn}
              onClick={() => setShowShareModal(true)}
              id="habit-share-btn"
              aria-label="Share habit"
            >
              <Share2 size={18} />
            </button>
          )}
          <button
            className={styles.deleteBtn}
            onClick={() => setShowDeleteConfirm(true)}
            id="habit-delete-btn"
            aria-label="Delete habit"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      {/* Stats Row */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <Flame size={18} className={styles.statIconFire} />
          <div className={styles.statValue}>{stats.current}</div>
          <div className={styles.statLabel}>Current</div>
        </div>
        <div className={styles.statCard}>
          <Trophy size={18} className={styles.statIconTrophy} />
          <div className={styles.statValue}>{stats.longest}</div>
          <div className={styles.statLabel}>Best</div>
        </div>
        <div className={styles.statCard}>
          <Hash size={18} className={styles.statIconTotal} />
          <div className={styles.statValue}>{stats.total}</div>
          <div className={styles.statLabel}>Total</div>
        </div>
        <div className={styles.statCard}>
          <TrendingUp size={18} className={styles.statIconRate} />
          <div className={styles.statValue}>{stats.rate}%</div>
          <div className={styles.statLabel}>Rate</div>
        </div>
      </div>

      {/* Analytics: Heatmap + Weekly Chart */}
      <div className={styles.analyticsSection}>
        <HabitHeatmap entries={entries} color={habit.color} habit={habit} />
        <HabitChart entries={entries} color={habit.color} habit={habit} />
      </div>

      {/* Month Navigation */}
      <div className={styles.monthNav}>
        <button
          className={styles.monthBtn}
          onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className={styles.monthLabel}>
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button
          className={styles.monthBtn}
          onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className={styles.calendar}>
        {/* Day labels */}
        <div className={styles.dayLabels}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className={styles.dayLabel}>{d}</div>
          ))}
        </div>

        {/* Date cells */}
        <div className={styles.dateGrid}>
          {/* Empty cells for offset */}
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className={styles.dateCell} />
          ))}

          {/* Day cells */}
          {daysInMonth.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const entry = getEntryForDate(dateStr);
            const isScheduled = isHabitScheduledOnDate(habit, day);
            const today = isToday(day);
            const future = isFuture(day) && !today;
            const isSelected = selectedDate === dateStr;
            const inMonth = isSameMonth(day, currentMonth);

            let statusClass = '';
            if (entry?.status === 'done') {
              statusClass = isScheduled ? styles.cellDone : styles.cellBonusDone;
            } else if (entry?.status === 'missed') {
              statusClass = styles.cellMissed;
            } else if (entry?.status === 'excused') {
              statusClass = styles.cellExcused;
            } else if (!isScheduled) {
              statusClass = styles.cellOffDay;
            }

            return (
              <button
                key={dateStr}
                className={`
                  ${styles.dateCell}
                  ${statusClass}
                  ${today ? styles.cellToday : ''}
                  ${future ? styles.cellFuture : ''}
                  ${isSelected ? styles.cellSelected : ''}
                  ${!inMonth ? styles.cellOutside : ''}
                `}
                onClick={() => handleDateClick(dateStr, day)}
                disabled={future}
                id={`cal-${dateStr}`}
                title={!isScheduled && !entry ? 'Off-day (click to log bonus entry)' : undefined}
              >
                <span className={styles.dateNumber}>{format(day, 'd')}</span>
                {entry && (
                  <span className={styles.statusIcon}>
                    {entry.status === 'done' && <Check size={12} />}
                    {entry.status === 'missed' && <X size={12} />}
                    {entry.status === 'excused' && <AlertTriangle size={10} />}
                  </span>
                )}
                {entry?.note && (
                  <span className={styles.noteIndicator} title={`Note: ${entry.note}`}>
                    <FileText size={9} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Month Notes Section */}
      {monthNotes.length > 0 && (
        <div className={styles.notesContainer}>
          <div className={styles.notesHeader}>
            <div className={styles.notesTitleRow}>
              <StickyNote size={16} className={styles.notesIcon} />
              <h3 className={styles.notesTitle}>
                Notes in {format(currentMonth, 'MMMM yyyy')}
              </h3>
            </div>
            <span className={styles.notesCountBadge}>{monthNotes.length}</span>
          </div>
          <div className={styles.notesList}>
            {monthNotes.map(n => {
              const d = new Date(n.date + 'T00:00:00');
              return (
                <button
                  key={n.id}
                  className={styles.noteCard}
                  onClick={() => handleDateClick(n.date, d)}
                  id={`note-card-${n.date}`}
                >
                  <div className={styles.noteCardTop}>
                    <span className={styles.noteDatePill}>{format(d, 'EEE, MMM d')}</span>
                    {n.status && (
                      <span className={`${styles.noteStatusPill} ${styles[`noteStatus_${n.status}`]}`}>
                        {n.status === 'done' ? '✓ Done' : n.status === 'missed' ? '✕ Missed' : '⚠ Excused'}
                      </span>
                    )}
                  </div>
                  <p className={styles.noteText}>{n.note}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Status Popup Modal */}
      {selectedDate && (
        <div className={styles.overlay} onClick={() => setSelectedDate(null)}>
          <div className={styles.statusModal} onClick={e => e.stopPropagation()}>
            <div className={styles.statusModalHeader}>
              <h3 className={styles.selectedDate}>
                {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d')}
              </h3>
              <button
                className={styles.statusModalClose}
                onClick={() => setSelectedDate(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {!isSelectedDateScheduled && (
              <div className={styles.offDayBanner}>
                <span>Off-day for this habit • Any entry logged here counts as a bonus</span>
              </div>
            )}

            {/* Status Picker */}
            <div className={styles.statusPicker}>
              {STATUS_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const isActive = selectedEntry?.status === opt.value;
                return (
                  <button
                    key={opt.value}
                    className={`${styles.statusBtn} ${isActive ? styles.statusActive : ''}`}
                    style={{
                      '--status-color': opt.color,
                      borderColor: isActive ? opt.color : undefined,
                      background: isActive ? `${opt.color}15` : undefined,
                    } as React.CSSProperties}
                    onClick={() => handleSetStatus(opt.value)}
                    id={`status-${opt.value}`}
                  >
                    <Icon size={18} style={{ color: opt.color }} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Note */}
            <div className={styles.noteSection}>
              {!showNoteInput && !selectedEntry?.note ? (
                <button
                  className={styles.addNoteBtn}
                  onClick={() => setShowNoteInput(true)}
                  id="add-note-btn"
                >
                  <MessageSquare size={16} />
                  Add a note
                </button>
              ) : (
                <div className={styles.noteInputWrapper}>
                  <textarea
                    className={styles.noteInput}
                    placeholder="How did it go today?"
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    rows={2}
                    id="habit-note-input"
                  />
                  {noteText.trim() && (
                    <button
                      className={styles.saveNoteBtn}
                      onClick={handleSaveNote}
                      id="save-note-btn"
                    >
                      Save Note
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Done / Close Button — always visible */}
            <button
              className={styles.doneBtn}
              onClick={handleDone}
              id="status-done-btn"
            >
              <Check size={18} />
              Done
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className={styles.overlay} onClick={() => setShowDeleteConfirm(false)}>
          <div className={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>Delete Habit?</h3>
            <p className={styles.confirmText}>
              This will permanently delete &quot;{habit.title}&quot; and all its entries. This cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className={styles.confirmDeleteBtn}
                onClick={onDelete}
                id="confirm-delete-habit"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareHabitModal
          habit={habit}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
