# ResQui

Sistema de gestão de reagentes e resíduos químicos para laboratórios universitários, do inventário
à destinação final. Desenvolvido como Trabalho de Conclusão de Curso.

Em produção: <https://resqui.com.br>

Backend .NET 10 (Clean Architecture), frontend React, PostgreSQL 16.

## Subir localmente com Docker Compose

```bash
cp .env.example .env
# Preencha no .env:
#   JWT_KEY         chave com 32 bytes ou mais (ex.: openssl rand -base64 48)
#   ADMIN_PASSWORD  senha do admin inicial (admin@resqui.local)
docker compose up -d --build
```

- Interface: <http://localhost:5173>
- API: <http://localhost:5000>

Entre com `admin@resqui.local` e a senha definida em `ADMIN_PASSWORD`. Para popular o banco com
dados de demonstração, defina `SEED_DEMO_DATA=true` no `.env` antes de subir. As migrações rodam
automaticamente na inicialização do backend.

## Testes

Backend (unitários e de integração):

```bash
cd backend
dotnet test
```

Os testes de integração (`ResQui.Tests.Integracao`) exercitam os gatilhos e as migrações contra um
PostgreSQL real e são pulados se a variável abaixo não estiver definida. O usuário precisa poder
criar bancos:

```bash
export RESQUI_TESTES_POSTGRES='Host=localhost;Port=5432;Database=postgres;Username=resqui;Password=resqui_dev'
```

Frontend (Vitest) e build:

```bash
cd frontend
npm ci
npm test
npm run build
```

E2E (Playwright), como no job `e2e` do CI. O backend roda em modo Development, que semeia o
admin com a senha `Admin@123` esperada pelos testes, e não pelo Compose:

```bash
docker compose up -d postgres

cd backend
ASPNETCORE_ENVIRONMENT=Development Seed__DemoData=true ASPNETCORE_URLS=http://localhost:5000 \
  dotnet run --project ResQui.API --no-launch-profile

# em outro terminal; o Playwright sobe o Vite em http://localhost:5173
cd frontend
npx playwright install chromium
PLAYWRIGHT_CHANNEL=chromium npx playwright test
```

A pipeline completa está em `.github/workflows/ci.yml`.

## Documentação

- [Proveniência da matriz de compatibilidade química](docs/compatibilidade-proveniencia.md)
- [Integridade da trilha de auditoria](docs/auditoria-integridade.md)

## Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE).
