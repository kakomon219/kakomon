/**
 * ファイル: lib/supabase.ts
 * バージョン: v1.0
 * 更新日: 2026-08-09
 * 内容: Question型にquestion_type('choice'|'essay')とmodel_answer(記述式の模範解答)を追加。
 *      記述式問題(第二次検定など)に対応。
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
};
