// Client-side notification helpers for task reminders
// Uses the browser Notification API — no server required

const NOTIFICATION_PERMISSION_KEY = 'trackme-notification-permission';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported in this browser');
    return false;
  }

  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  localStorage.setItem(NOTIFICATION_PERMISSION_KEY, result);
  return result === 'granted';
}

export function getNotificationPermission(): NotificationPermission | null {
  if (!('Notification' in window)) return null;
  return Notification.permission;
}

export function showNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: options?.tag || 'trackme-default',
      ...options,
    });

    // Auto-close after 8 seconds
    setTimeout(() => notification.close(), 8000);
    return notification;
  } catch {
    // Fallback for service worker context
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, {
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: options?.tag || 'trackme-default',
          ...options,
        });
      });
    }
  }
}

// Schedule a notification for a task at a specific time
// Uses setTimeout — works only while the app/PWA is open
interface ScheduledReminder {
  taskId: string;
  timerId: ReturnType<typeof setTimeout>;
}

const activeReminders: Map<string, ScheduledReminder> = new Map();

export function scheduleTaskReminder(
  taskId: string,
  taskTitle: string,
  dateStr: string,
  timeStr: string,
) {
  // Cancel any existing reminder for this task
  cancelTaskReminder(taskId);

  const targetTime = new Date(`${dateStr}T${timeStr}:00`).getTime();
  const now = Date.now();
  const delay = targetTime - now;

  // Don't schedule if the time has already passed
  if (delay <= 0) return;

  const timerId = setTimeout(() => {
    showNotification(`⏰ ${taskTitle}`, {
      body: `It's time for your task!`,
      tag: `task-${taskId}`,
    });
    activeReminders.delete(taskId);
  }, delay);

  activeReminders.set(taskId, { taskId, timerId });
}

export function cancelTaskReminder(taskId: string) {
  const existing = activeReminders.get(taskId);
  if (existing) {
    clearTimeout(existing.timerId);
    activeReminders.delete(taskId);
  }
}

export function cancelAllReminders() {
  activeReminders.forEach(r => clearTimeout(r.timerId));
  activeReminders.clear();
}
