/**
 * ファイル: lib/supabase.ts
 * バージョン: v1.2
 * 更新日: 2026-08-11
 * 内容: Question型にimage_url2(2枚目の図表画像)を追加。
 *      建築施工管理技士二級 令和7年度 第二次検定の問題1で、配置図+工程表と
 *      工事概要表の2枚を1問に紐付けるために使用する。
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
  image_url2: string | null;
  shuffle_choices: boolean;
};
