# Condivisione Rapida con Cloudflare Tunnel (senza dominio)

Questo è il modo più rapido per condividere la tua app locale online senza comprare un dominio e senza toccare il firewall.

## 🛠️ Fase 1: Installazione di cloudflared
- Esegui `cloudflared-windows-amd64.msi` (incluso nel repository) oppure usa `cloudflared.exe`.
- L’installer prepara il PC; non si apre alcuna app.

## 🔑 Fase 2: Sblocco dell’autenticazione (zona fittizia)
- Vai a `https://dash.cloudflare.com/` (se il dashboard è temporaneamente indisponibile, riprova più tardi).
- Aggiungi un dominio fittizio (formato valido, es. `amicoapptest.com`).
- Scegli il piano Free e continua.
- Ignora la configurazione DNS e i nameserver: prosegui fino in fondo.
- Abilita Zero Trust: imposta un nome Team minimo.

## 🗝️ Fase 3: Connessione e autorizzazione
- Apri PowerShell.
- Esegui: `cloudflared tunnel login`
- Si apre il browser: seleziona il dominio fittizio appena creato e conferma.

## 🚀 Fase 4: Avvio dei Tunnel Temporanei (due finestre)
Apri due finestre PowerShell distinte e avvia due tunnel:

- Frontend (sviluppo):
  - `cloudflared tunnel --url http://localhost:8080`
  - Usa l’URL pubblico generato per aprire la UI.

- Backend/API:
  - `cloudflared tunnel --url http://localhost:4000`
  - Usa l’URL pubblico per le chiamate API o la SPA prod (da `dist`).

> Importante: mantieni aperte le due finestre; se le chiudi, gli URL cessano di funzionare.

## Note
- Same-origin: quando usi il tunnel, la SPA e le API devono essere sullo stesso dominio; la build prod è già servita dal backend (`http://localhost:4000`).
- Evita `127.0.0.1` dal browser: molti ad‑block lo bloccano; il client è stato configurato per usare same‑origin.
- Se ricevi errori `1033`, riavvia `cloudflared` o attendi la stabilizzazione.

## Variabili `.env`
```
VITE_USE_LOCAL_SERVER=true
VITE_LOCAL_SERVER_URL=
VITE_USE_LOCAL_DB=false
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Backend opzionali (impostare come variabili ambiente)
DEFAULT_PASSWORD=1
JWT_SECRET=modifica-questo-valore
```

## Avvio Locale
- `npm i`
- `npm run server`
- `npm run build` (SPA servita da backend)
- Opzionale: `npm run dev` per avviare il frontend sviluppo su `http://localhost:8080`.
