'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Target, CheckSquare, Users, Settings } from 'lucide-react';
import styles from './TabBar.module.css';

const tabs = [
  { href: '/', label: 'Habits', icon: Target },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/shared', label: 'Shared', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav className={styles.tabBar} id="main-navigation">
      <div className={styles.tabBarInner}>
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/'
            ? pathname === '/'
            : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`${styles.tab} ${isActive ? styles.active : ''}`}
              id={`nav-tab-${label.toLowerCase()}`}
            >
              <span className={styles.iconWrapper}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && <span className={styles.activeIndicator} />}
              </span>
              <span className={styles.label}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
