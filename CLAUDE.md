# kakomon(過去問アプリ)

## 構成
- Next.js 14 App Router / TypeScript
- Supabase(プロジェクト: kakomon219, 東京リージョン)
- Vercel: kakomon-three.vercel.app

## 主なテーブル
- questions … 問題本体(qualification, exam_round, theme, question_no,
  question_text, correct_answer, explanation, image_url, needs_image)
- attempts … 解答履歴(user_id, question_id, selected_answer,
  is_correct, answered_at)
- review_clears … 間違えた問題一覧から消した記録(user_id, question_id, cleared_at)
- users … 利用者

## ファイル冒頭のヘッダーコメント(必須)
変更したファイルは先頭のコメントを必ず更新する。書式:

    /**
     * ファイル: <パス>
     * バージョン: vX.Y
     * 更新日: YYYY-MM-DD
     * 内容: <この版で何を変えたか>
     * 前版: <ひとつ前の版の要約>
     */

画面にもバージョンを出しているので、表示側の値も合わせて上げること。

## 問題データ登録のルール
- **1セッション1年度**。まとめて複数年度を処理しない
- **前年度の流用は禁止**。年度ごとに試験名称も設問構成も変わる
  - 令和3年度以降 … `令和○年度 第二次検定`
  - 令和2年度以前 … `令和2年度 実地試験`(制度変更前)
- 作業内容は `hikitugi/hikitugiYYYYMMDDNN.MD` に残す

## やらないこと
- main への直接コミット禁止。必ずブランチ + PR
- 既存の解答履歴(attempts)を消す変更は事前に確認を取る
