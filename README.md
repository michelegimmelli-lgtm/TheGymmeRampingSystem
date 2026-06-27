# TheGymme Ramping System

Web app/PWA React per generare protocolli di ramping per esercizi fondamentali.

L'app permette di:

- selezionare esercizio, peso target, serie e ripetizioni;
- generare sempre un output ordinato in Mobilita, Attivazione, Ramping, Work Set, Recuperi, Cues Tecnici, Over 40 Notes e Suggerimento prossima seduta;
- calcolare i carichi di ramping da percentuali definite nei JSON;
- arrotondare i carichi ai 2,5 kg secondo configurazione;
- valutare le reps completate con un Progression Engine oggettivo e configurabile;
- valutare ogni serie con celle reps modificabili, fino a 8 serie.

## Versione app

La versione mostrata in alto a destra nell'interfaccia e configurata in:

```text
src/appConfig.js
```

Per aggiornarla:

```js
export const APP_VERSION = "1.0";
```

## Architettura dati

Tutta la logica allenamento vive nei JSON statici:

```text
public/data/
  exercises/
    exercises.json
  patterns/
    squat.json
    hinge.json
    horizontal_push.json
    vertical_push.json
    horizontal_pull.json
    vertical_pull.json
  progression/
    progression_rules.json
  settings/
    rounding.json
```

Il codice React funziona solo da engine e UI: legge i dati, calcola i carichi e formatta il protocollo.

## Esercizi

Gli esercizi sono definiti in:

```text
public/data/exercises/exercises.json
```

Esempio:

```json
{
  "back_squat": {
    "name": "Back Squat",
    "pattern": "squat"
  },
  "bench_press": {
    "name": "Bench Press",
    "pattern": "horizontal_push"
  }
}
```

Per aggiungere un esercizio basta aggiungere una nuova voce e collegarla a un pattern esistente.

## Pattern

Ogni pattern contiene:

- mobilita;
- attivazione;
- percentuali ramping;
- recuperi;
- cues tecnici;
- Over 40 Notes.

Esempio di step ramping:

```json
{ "percentage": 0.5, "reps": 5 }
```

L'engine calcola:

```text
peso target x percentage
```

poi arrotonda secondo `public/data/settings/rounding.json`.

Formato output obbligatorio:

```text
55 kg x 5 (50%)
```

## Progression Engine

Le regole sono definite in:

```text
public/data/progression/progression_rules.json
```

Regole MVP configurate:

- tutte completate: aumenta +2,5 kg;
- manca 1 rep totale: ripeti stesso peso e schema;
- mancano 2-3 reps: consolida, stesso peso oppure 5x3;
- mancano 4+ reps: cedimento evidente, deload -5% oppure volume ridotto.

Il calcolo usa sempre lo schema target completo. Per esempio, su `5x5`, l'input `3, 2, 4, 2, 4` viene letto come 15 reps completate su 25, quindi 10 reps mancanti e regola di cedimento evidente.

## Sviluppo locale

Prerequisiti:

- Node.js installato;
- npm installato.

Installare le dipendenze:

```powershell
npm install
```

Avviare l'app in locale:

```powershell
npm start
```

Se PowerShell blocca `npm.ps1` con un errore di execution policy, usare:

```powershell
npm.cmd start
```

Aprire:

```text
http://localhost:3000
```

Se un'altra app usa gia la porta 3000:

```powershell
$env:PORT='3001'
npm start
```

## Build

Creare una build di produzione:

```powershell
npm run build
```

Se PowerShell blocca `npm.ps1`, usare:

```powershell
npm.cmd run build
```

La build viene generata in:

```text
build/
```

## Test

Avviare i test:

```powershell
npm test
```

Oppure, in caso di blocco PowerShell:

```powershell
npm.cmd test
```

## Deploy Vercel

Il progetto e pensato per essere pubblicato come app statica su Vercel.

La build CRA produce file statici in:

```text
build/
```

## File principali

```text
src/App.js
src/App.css
src/appConfig.js
src/utils/rampingData.js
src/utils/rampingEngine.js
public/data/exercises/exercises.json
public/data/patterns/*.json
public/data/progression/progression_rules.json
public/data/settings/rounding.json
```
