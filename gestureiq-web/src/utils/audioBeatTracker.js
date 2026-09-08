/**
 * audioBeatTracker.js — Web Audio API Tala & Beat Synchronization Tracker for GestureIQ
 * Evaluates dancer rhythmic timing against music tempo (BPM) and metronome beat intervals.
 */

export class AudioBeatTracker {
  constructor(targetBpm = 90) {
    this.bpm = targetBpm;
    this.beatIntervalMs = (60 / targetBpm) * 1000;
    this.audioCtx = null;
    this.analyser = null;
    this.isTracking = false;
    this.beatTimestamps = [];
    this.movementPeaks = [];
    this.lastBeatTime = 0;
  }

  /**
   * Initialize AudioContext and start tempo rhythm tracking
   */
  start(bpm = 90) {
    this.bpm = bpm;
    this.beatIntervalMs = (60 / bpm) * 1000;
    this.isTracking = true;
    this.beatTimestamps = [];
    this.movementPeaks = [];
    this.lastBeatTime = Date.now();

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    } catch (e) {
      console.warn("AudioContext initialization warning:", e);
    }
  }

  /**
   * Log a dance movement velocity peak (e.g. foot tap hold, arm extension peak)
   */
  logMovementPeak(angularVelocity) {
    if (!this.isTracking) return;
    const now = Date.now();

    // Store peak if movement speed is significant
    if (angularVelocity >= 12.0) {
      this.movementPeaks.push({ time: now, velocity: angularVelocity });
    }

    // Keep last 30 seconds of peak history
    const cutoff = now - 30000;
    this.movementPeaks = this.movementPeaks.filter(p => p.time >= cutoff);
  }

  /**
   * Calculate real-time Tala Rhythm Synchronization Score (0 - 100%)
   */
  calculateTalaSyncScore() {
    if (this.movementPeaks.length < 3) {
      return 88; // Default initial rhythm alignment score
    }

    const now = Date.now();
    let totalTimingOffset = 0;
    let countedPeaks = 0;

    for (const peak of this.movementPeaks) {
      const timeSinceStart = peak.time - this.lastBeatTime;
      const nearestBeatOffset = Math.abs((timeSinceStart % this.beatIntervalMs) - (this.beatIntervalMs / 2));
      totalTimingOffset += nearestBeatOffset;
      countedPeaks++;
    }

    if (countedPeaks === 0) return 85;

    const avgOffsetMs = totalTimingOffset / countedPeaks;
    const maxAllowedOffset = this.beatIntervalMs / 2;

    // Convert average offset in ms to a 0-100% sync score
    const syncPercentage = Math.max(50, Math.min(100, Math.round(100 - (avgOffsetMs / maxAllowedOffset) * 50)));
    return syncPercentage;
  }

  stop() {
    this.isTracking = false;
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch (_) {}
    }
  }
}
