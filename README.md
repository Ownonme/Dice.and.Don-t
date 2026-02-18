# Dice & Don't

Web app per supportare campagne di gioco di ruolo da tavolo: gestione personaggi, librerie di magie/abilità, mercato, glossario, diario e un sistema dadi condiviso con storico in tempo reale.

## Demo
- GitHub Pages: https://ownonme.github.io/Dice-Don-t
- Release: https://api.diceanddont.uk/
- (Alternativo) Netlify: https://diceanddont.netlify.app

## Funzionalità principali
- **Personaggi**: scheda, statistiche, equipaggiamento, inventario, anomalie.
- **Dadi**: tiri azione/danno, critici, selezioni guidate (stat/competenze/bersaglio) e storico.
- **Magie e abilità**: librerie per categoria/grado/livello, detail modal, import e gestione.
- **Mercato**: città, negozi, oggetti, carrello e storico acquisti.
- **Glossario**: sezioni/termini con contenuti ricchi e immagini.
- **Diario**: lettura/scrittura con pagine e layout dedicati.
- **Admin**: strumenti di gestione contenuti (anomalie, effetti danno, materiali, tipi arma, evocazioni, ecc.).

## Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind, shadcn/ui (Radix), React Router, TanStack Query.
- **Backend locale (opzionale)**: Node/Express + LowDB (JSON), upload file, autenticazione JWT, realtime via SSE.
- **Storage remoto (opzionale)**: Supabase (URL + anon key lato client).

## Struttura del progetto
- `src/`: frontend (pagine, componenti, hook, integrazioni).
- `server/`: backend locale (Express + LowDB).
- `csv/`: dataset CSV importabile nel database locale.
- `docs/`: guide operative (es. Cloudflare Tunnel).

## Avvio rapido (sviluppo)
Prerequisiti: Node.js 18+ (consigliato 20.x) e npm.

```bash
npm i
```

1) Crea `.env` partendo da `.env.example`.
2) (Consigliato) avvia il backend locale:
```bash
npm run server
```
3) Avvia il frontend (Vite):
```bash
npm run dev
```

Apri: http://localhost:5173

## Modalità backend e priorità
Il frontend decide dove leggere/scrivere i dati in base alle variabili d’ambiente:

- **Supabase (remoto)**: se `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` sono valorizzate.
- **Server locale**: se `VITE_USE_LOCAL_SERVER=true`, oppure se Supabase non è configurato. In DEV, di default usa `http://127.0.0.1:4000`.
- **Local DB (offline)**: modalità UI/offline (dati in `localStorage`) con `VITE_USE_LOCAL_DB=true`.

## Configurazione `.env`
Crea un file `.env` nella root (i `.env` sono ignorati da git).

Esempio (sviluppo con server locale):
```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_USE_LOCAL_DB=false
VITE_USE_LOCAL_SERVER=true
VITE_LOCAL_SERVER_URL=
```

Esempio (Supabase remoto):
```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_USE_LOCAL_DB=false
VITE_USE_LOCAL_SERVER=false
VITE_LOCAL_SERVER_URL=
```

Variabili backend (facoltative, da impostare come variabili d’ambiente del processo `npm run server`):
```bash
PORT=4000
DEFAULT_PASSWORD=1
JWT_SECRET=local-secret-change-me
SEED_ADMIN=true
```

## Database locale (LowDB)
Il server locale persiste i dati su file:
- `server/db.json` (ignorato da git)
- `server/uploads/` per file caricati (ignorata da git)

Per inizializzare/rigenerare il DB locale da CSV:
```bash
npm run import:csv
```

## Script utili
- `npm run dev`: avvio frontend (Vite)
- `npm run dev:remote`: avvio frontend in modalità remote
- `npm run server`: avvio backend locale (porta `PORT` o 4000)
- `npm run build`: build produzione (Vite)
- `npm run build:remote`: build produzione (remote)
- `npm run preview`: preview build
- `npm run lint`: lint ESLint
- `npm run import:csv`: importa dataset CSV nel DB locale
- `npm run deploy`: deploy su GitHub Pages (gh-pages)

## Build e deploy
Build:
```bash
npm run build
```

GitHub Pages:
```bash
npm run deploy
```

## Realtime (server locale)
- SSE: `GET /api/dice_rolls/stream`
- SSE: `GET /api/roll_history/stream`

## Accesso remoto (Cloudflare Tunnel)
Per esporre rapidamente il server locale su internet (utile per playtest), vedi:
- [Cloudflare-Quick-Guide.md](docs/Cloudflare-Quick-Guide.md)

## Note
- `.env` e `.env.*` sono esclusi dal repository (rimane versionato solo `.env.example`).
- Il DB locale (`server/db.json`) non viene committato: utile per sviluppo, demo e playtest senza rischi di dati “sporchi” in repo.
