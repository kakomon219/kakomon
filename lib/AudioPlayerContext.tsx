/**
 * ファイル: lib/AudioPlayerContext.tsx
 * バージョン: v1.0
 * 更新日: 2026-07-26
 * 内容: リスニング音声をページ遷移をまたいで鳴らし続けるためのContext。
 *      同じaudio_urlの間は再生を継続、違うurlに変わったときだけ最初から再生し直す
 */

"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";

type AudioPlayerContextType = {
  currentUrl: string | null;
  isPlaying: boolean;
  play: (url: string) => void;
  stop: () => void;
};

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

export function AudioPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const play = useCallback(
    (url: string) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (currentUrl !== url) {
        // 違う音声に切り替わったときだけ最初から再生
        audio.src = url;
        audio.currentTime = 0;
        setCurrentUrl(url);
        audio.play().catch(() => {
          // 自動再生がブラウザに止められた場合は再生ボタン操作待ちにする
          setIsPlaying(false);
        });
        setIsPlaying(true);
      }
      // 同じurlならすでに鳴っているので何もしない(再スタートしない)
    },
    [currentUrl]
  );

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, []);

  return (
    <AudioPlayerContext.Provider value={{ currentUrl, isPlaying, play, stop }}>
      <audio ref={audioRef} />
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) {
    throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  }
  return ctx;
}
