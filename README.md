# Racoon Royal 🎟

Lodtrækning om 2 × 2 billetter til Phoebe Bridgers (11. dec) og Gilli (18. dec) i Royal Arena.

- **Forside** (`/`) - kunderne vælger koncert, skriver navn/firma/email og bekræfter, at de kan på dagen.
- **Admin** (`/admin`) - se alle tilmeldinger, download CSV til Excel, og træk 2 vindere pr. koncert.

Samme email kan kun have ét lod pr. koncert - tilmelder man sig igen, opdateres det gamle lod.

## Sådan kommer den online (GitHub + Railway)

1. Opret et nyt repo på GitHub, fx `racoon-royal`.
2. Upload alle filerne (Add file → Upload files). Mappen `public` skal med.
3. På Railway: **New Project → Deploy from GitHub repo** → vælg `racoon-royal`.
4. Under **Variables** tilføjer du:
   - `ADMIN_PASSWORD` = et kodeord du selv vælger
   - `DATA_DIR` = `/data`
   - `DEADLINE` (valgfri) = fx `2026-12-02T23:59:00+01:00` - så lukker siden automatisk
5. Højreklik på servicen → **Attach Volume** → mount path `/data`.
   (Vigtigt! Uden volume forsvinder tilmeldingerne, hver gang Railway genstarter.)
6. Under **Settings → Networking** → **Generate Domain**. Det er linket, der skal i mailen.

## Admin

Gå til `https://<dit-domæne>/admin`. Brugernavn: hvad som helst. Kodeord: `ADMIN_PASSWORD`.
