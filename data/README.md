# Locaties bewerken

De kaart op de website komt uit twee bestanden in deze map:

- `kastjes.csv` — de leenfrisbee kastjes
- `clubs.csv` — de frisbeeclubs

Je kunt ze bewerken op github.com (klik op het bestand → potloodje rechtsboven → wijzig → "Commit changes") of in een spreadsheet-programma (Excel, Numbers, Google Sheets) en dan opslaan als CSV en uploaden.

Na het opslaan wordt de website binnen ±2 minuten automatisch bijgewerkt. Staat er iets fout in de data, dan krijgt je wijziging een rood kruisje op github.com; klik erop om de foutmelding te lezen (bijvoorbeeld `kastjes.csv rij 7 (Griftpark): lat ontbreekt`). De website blijft dan op de vorige versie staan tot de fout is opgelost.

## Coördinaten (lat/lon) opzoeken

1. Open [Google Maps](https://maps.google.com) en zoek de plek.
2. Klik met de rechtermuisknop precies op de plek (op de telefoon: lang indrukken).
3. De bovenste regel in het menu zijn de coördinaten, bijvoorbeeld `52.10031, 5.12612`. Klik erop om te kopiëren.
4. Het eerste getal is `lat`, het tweede `lon`. Een punt of komma als decimaalteken maakt niet uit.

## Kolommen in `kastjes.csv`

| kolom | verplicht | uitleg |
|---|---|---|
| id | ja | unieke code zonder spaties, bijv. `utrecht-griftpark`. Verander deze daarna niet meer. |
| naam | ja | naam zoals op de kaart getoond |
| plaats | ja | stad of dorp |
| adres | nee | straat of beschrijving van de plek |
| lat | ja | breedtegraad, bijv. `52.1003` |
| lon | ja | lengtegraad, bijv. `5.1261` |
| omschrijving | nee | korte tekst in het Nederlands |
| omschrijving_en | nee | dezelfde tekst in het Engels (anders wordt de Nederlandse getoond) |
| foto_url | nee | link naar een foto, moet beginnen met `https://` (met `http://` toont de browser de foto niet, want de site zelf is beveiligd met https) |
| website | nee | link naar een website, begint met `https://` |
| status | ja | `actief` of `verwijderd` (verwijderde kastjes worden niet getoond maar blijven in het bestand) |
| club_id | nee | `id` van een club uit `clubs.csv`, bijv. `ufo-utrecht`. Toont de club bij de details van het kastje en tekent een lijntje op de kaart. |

## Kolommen in `clubs.csv`

| kolom | verplicht | uitleg |
|---|---|---|
| id | ja | unieke code zonder spaties, bijv. `ufo-utrecht` |
| naam | ja | naam van de club |
| plaats | ja | stad of dorp |
| lat | ja | breedtegraad |
| lon | ja | lengtegraad |
| website | nee | begint met `https://` |
| omschrijving | nee | korte tekst in het Nederlands |
| omschrijving_en | nee | dezelfde tekst in het Engels |

## Tips

- Laat de eerste regel (de kolomnamen) altijd staan.
- Een komma in een tekst? Zet de hele tekst dan tussen dubbele aanhalingstekens: `"Bij het veld, naast de bank"`. Spreadsheet-programma's doen dit automatisch.
- De voorbeeldregels mag je verwijderen of aanpassen.
