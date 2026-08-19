'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './SplashScreen.module.css';

export default function SplashScreen() {
  // Phase: 'active' -> 'blackout' (content fades) -> 'revealing' (curtain fades) -> 'done'
  const [phase, setPhase] = useState<'active' | 'blackout' | 'revealing' | 'done'>('active');

  useEffect(() => {
    // Stage 1: Display logo + brand name for 1.2 seconds
    const timer1 = setTimeout(() => {
      setPhase('blackout'); // Content fades out, leaving solid pure black screen
    }, 1200);

    // Stage 2: Hold the pitch-black screen for ~250ms so the blackout is distinctly felt
    const timer2 = setTimeout(() => {
      setPhase('revealing'); // Black curtain dissolves to reveal the app
    }, 1500);

    // Stage 3: Complete transition and unmount
    const timer3 = setTimeout(() => {
      setPhase('done');
    }, 1800);

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
          <Image
            src="/icon.svg"
            alt="Tsugi(t) Logo"
            className={styles.logoSvg}
            width={96}
            height={96}
            priority
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
