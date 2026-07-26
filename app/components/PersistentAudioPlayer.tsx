/**
 * ファイル: app/components/PersistentAudioPlayer.tsx
 * バージョン: v1.0
 * 更新日: 2026-07-26
 * 内容: 画面下部に固定表示する、大きめの再生/停止ボタンのみのシンプルな音声バー
 */

"use client";

import { useAudioPlayer } from "@/lib/AudioPlayerContext";

export default function PersistentAudioPlayer() {
  const { currentUrl, isPlaying, stop } = useAudioPlayer();

  if (!currentUrl) return null;

  return (
    <div className="audio-bar">
      <button className="audio-stop-btn" onClick={stop}>
        {isPlaying ? "⏸ 一時停止" : "▶ 再生"}
      </button>
    </div>
  );
}
