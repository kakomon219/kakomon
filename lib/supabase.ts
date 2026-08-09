/**
 * ファイル: lib/supabase.ts
 * バージョン: v1.1
 * 更新日: 2026-08-10
 * 内容: Question型にshuffle_choices(選択肢をシャッフルするかどうかのフラグ)を追加。
 *      正解が特定番号に偏っている問題群(漢字検定・食生活アドバイザー3級オリジナル問題)のみtrue。
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
  },
});

export type Question = {
  id: number;
  qualification: string | null;
  exam_round: string | null;
  theme: string | null;
  question_text: string;
  question_type: string | null;
  choice_1: string | null;
  choice_2: string | null;
  choice_3: string | null;
  choice_4: string | null;
  choice_5: string | null;
  choice_6: string | null;
  correct_answer: number | null;
  model_answer: string | null;
  explanation: string | null;
  translation: string | null;
  audio_url: string | null;
  image_url: string | null;
  shuffle_choices: boolean;
};
