/**
 * ファイル: app/[qualification]/layout.tsx
 * バージョン: v1.0
 * 更新日: 2026-07-26
 * 内容: [qualification]配下(一覧・個別問題ページ)全体をAudioPlayerProviderと
 *      常設の音声バーでラップする
 */

import { AudioPlayerProvider } from "@/lib/AudioPlayerContext";
import PersistentAudioPlayer from "@/app/components/PersistentAudioPlayer";

export default function QualificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AudioPlayerProvider>
      {children}
      <PersistentAudioPlayer />
    </AudioPlayerProvider>
  );
}
