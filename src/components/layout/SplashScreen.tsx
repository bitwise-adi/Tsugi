'use client';

import { useState, useEffect } from 'react';
import styles from './SplashScreen.module.css';

export default function SplashScreen() {
  // Phase: 'active' -> 'blackout' (content fades) -> 'revealing' (curtain fades) -> 'done'
  const [phase, setPhase] = useState<'active' | 'blackout' | 'revealing' | 'done'>('active');

  useEffect(() => {
    // Stage 1: Display logo + brand name for ~1.3 seconds
    const timer1 = setTimeout(() => {
      setPhase('blackout'); // Content fades out, leaving pure black screen
    }, 1300);

    // Stage 2: 60ms pure black screen pause, then curtain starts lifting
    const timer2 = setTimeout(() => {
      setPhase('revealing'); // Overlay fades out to reveal the app
    }, 1370);

    // Stage 3: Complete transition and unmount component
    const timer3 = setTimeout(() => {
      setPhase('done');
    }, 1700);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  if (phase === 'done') {
    return null;
  }

  const isContentHidden = phase === 'blackout' || phase === 'revealing';
  const isOverlayFading = phase === 'revealing';

  return (
    <div
      className={`${styles.splashOverlay} ${isOverlayFading ? styles.fadeOutOverlay : ''}`}
      aria-hidden="true"
    >
      <div className={`${styles.content} ${isContentHidden ? styles.fadeOutContent : ''}`}>
        <div className={styles.logoWrapper}>
          <div className={styles.ambientGlow} />
          <img
            src="/icon.svg"
            alt="Tsugi(t) Logo"
            className={styles.logoSvg}
            width={96}
            height={96}
          />
        </div>

        <h1 className={styles.title}>
          Tsugi<span className={styles.titleAccent}>(t)</span>
        </h1>

        <p className={styles.tagline}>Mending daily cadence</p>

        <div className={styles.progressBarContainer}>
          <div className={styles.progressBar} />
        </div>
      </div>
    </div>
  );
}
