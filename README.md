# portfolio-counter-api

API serverless de contagem de visitas para o portfólio de [Klayton Dias](https://ton-chyod-s.me), deployada na Vercel com Redis (Upstash) como banco de dados.

**Documentação interativa:** [api.ton-chyod-s.me](https://api.ton-chyod-s.me)

---

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/visit` | Incrementa o contador de visitas |
| `GET` | `/api/count` | Retorna o total atual de visitas |

### `POST /api/visit`

Registra uma nova visita. Requer que a requisição venha de um domínio autorizado.

**Rate limit:** 1 incremento por IP a cada 10 minutos.

**Respostas:**

```json
// 200 OK
{ "count": 42 }

// 403 Forbidden — origem não autorizada
{ "error": "Forbidden" }

// 429 Too Many Requests — rate limit atingido
{ "error": "Too many requests", "retryAfter": 543 }
```

### `GET /api/count`

Retorna o total de visitas sem incrementar. Aceita requisições de qualquer origem.

**Resposta:**

```json
// 200 OK
{ "count": 42 }
```

---

## Tecnologias

- **Runtime:** Node.js (Vercel Serverless Functions)
- **Banco de dados:** [Upstash Redis](https://upstash.com) (REST HTTP)
- **Deploy:** [Vercel](https://vercel.com)

---

## Estrutura

```
api/
  visit.js              # entrypoint Vercel → src/controllers/visitController
  count.js              # entrypoint Vercel → src/controllers/countController
src/
  config/
    redis.js            # instância do cliente Redis
  models/
    visitModel.js       # acesso a dados: getCount, incrementCount, checkRateLimit
  controllers/
    visitController.js  # lógica do POST /api/visit
    countController.js  # lógica do GET /api/count
public/
  index.html            # Swagger UI
  favicon.svg
```

---

## Variáveis de Ambiente

```env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
ALLOWED_ORIGINS=https://ton-chyod-s.github.io,https://ton-chyod-s.me
```

Copie `.env.example` para `.env` e preencha com suas credenciais do Upstash.

---

## Segurança

- **Validação de origem:** apenas domínios listados em `ALLOWED_ORIGINS` podem chamar `POST /api/visit`
- **Rate limiting por IP:** operação atômica via `SET NX EX` no Redis, sem race condition
- **CORS restrito:** o header `Access-Control-Allow-Origin` reflete somente a origem autorizada
