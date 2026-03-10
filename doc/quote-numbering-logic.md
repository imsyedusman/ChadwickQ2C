# Quote Numbering Refactor

> [!NOTE]
> Quote numbering was refactored on 2026-03-10 to generate values starting with the format `QYY-NNNN` where `YY` is the two digit year and `NNNN` is a sequential internal counter stored per-year in the database. When duplicating an existing quote, the same sequence remains but a revision suffix (e.g. `-A`) is appended.

## Quote Sequence Model
A dedicated table exists to manage race conditions securely: `QuoteSequence`.
This model tracks the last sequence assigned within a given `year` without requiring scanning the entire `Quote` table manually.

## Core Utility
All logic resides at `lib/quote-numbering.ts`.
This central utility exports two key functions:
- `generateNextQuoteNumber()`: Returns the next logical quote number with padding. Checks config, seeds if not present, and applies +1 via atomic `$transaction`.
- `generateRevisionNumber()`: Parses an existing quote number and systematically applies the next logical alphabetic character.

## Configured File Locations
The following files control the quote numbering logic:
- `lib/quote-numbering.ts` - Core utility that generates the next sequenced number and revision suffixes.
- `lib/quote-number-config.ts` - Centralized file for administrators to dictate the starting offset when generating the *very first* quote of a year.
- `prisma/schema.prisma` - Contains the `QuoteSequence` model utilized by the core utility.

## Configuring Starting Offsets
Starting offsets (such as picking up legacy tenders halfway through the year) can be set manually at `lib/quote-number-config.ts`.
These static properties are only ingested when creating the first sequence of a given year. If it does not exist, the default begins at sequence number 1 (`0001`).

```typescript
// File: lib/quote-number-config.ts
export const QuoteSequenceConfig: Record<number, number> = {
  2026: 239 // +1 becomes Q26-0240
};
```

If we need to change the starting number later, the estimator or admin should only need to modify this value.
For example, a change from `239` → `300` would make the next generated quote: `Q26-0301`.

### Interaction With the Database Sequence
> [!IMPORTANT]
> The config value is **only used when the sequence for that year is first created**. 
> If a sequence already exists in the database, changing this file will **NOT** affect numbering.

Meaning, if the `QuoteSequence` table already contains:
- `year: 2026`
- `lastNumber: 245`
Then updating the config file will not change existing numbering. In that case, the admin would need to manually update the database record.

For example:
```sql
UPDATE "QuoteSequence"
SET "lastNumber" = 239
WHERE "year" = 2026;
```
