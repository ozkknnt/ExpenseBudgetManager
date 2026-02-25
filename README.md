# ExpenseBudgetManager

## セットアップ

1) `.env.example` を `.env` にコピーして必要なら値を調整

2) 依存関係をインストール

```sh
pnpm i
```

3) PostgreSQL を起動

```sh
pnpm db:up
```

4) マイグレーションを適用

```sh
pnpm db:migrate
```

5) シードデータを投入

```sh
pnpm db:seed
```

6) 開発サーバーを起動（Web + API）

```sh
pnpm dev
```

Web: `http://localhost:3000`  
API: `http://localhost:3001`

## Health check

```sh
curl -i http://localhost:3001/health
```
