# Expense Budget Manager

API/DB/UI を同一リポジトリで管理するためのモノレポ構成。

## 構成

- `apps/api` API サーバ
- `apps/web` 管理 UI
- `infra` Docker Compose, DB 初期化
- `docs` ER 図と仕様

## ローカル起動

### DB(PostgreSQL)

```sh
docker compose -f infra/docker-compose.yml up
```

### API

```sh
cd apps/api
npm install
npm run dev
```

### Web

```sh
cd apps/web
npm install
npm run dev
```

## ドキュメント

- ER 図: `docs/ER.md`
- 仕様メモ: `docs/spec.md`
