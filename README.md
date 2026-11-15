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

E2E (Playwright): com o backend rodando em `http://localhost:5000` com dados de demonstração
(`Seed__DemoData=true`), rode:

```bash
cd frontend
npx playwright test
```

A pipeline completa está em `.github/workflows/ci.yml`.

## Documentação

- [Proveniência da matriz de compatibilidade química](docs/compatibilidade-proveniencia.md)
- [Integridade da trilha de auditoria](docs/auditoria-integridade.md)

## Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE).
