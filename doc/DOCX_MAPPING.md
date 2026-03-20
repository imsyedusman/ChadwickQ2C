# DOCX Export Mapping Documentation

This document explains how board descriptions are generated, how they can be overridden, and how they are mapped to the DOCX template.

## Overview Flow

1.  **Selection**: User selects board parameters (Type, Form, IP, etc.) in the `PreSelectionWizard`.
2.  **Configuration**: These values are stored in the `Board.config` JSON object.
3.  **Generation**: The `lib/description-logic.ts` module processes the `config` and board items to generate a list of bullets.
4.  **Preview**: The `BoardContent` component shows the combined view in a dedicated dialog.

### 3. Unified Description List (Draft Model)
- **Single List**: All descriptions (system and manual) are managed in one list.
- **Smart Sync**: System bullets (Form, IP, etc.) update automatically when preselection changes, *unless* the user has manually edited that specific bullet.
- **Manual Overrides**: Editing a system bullet in the list "captures" it, preserving the text even if preselection changes later.
- **Add & Delete**: Users can add unlimited extra bullets or delete any bullet (system or manual) from the list.
- **Refresh Button**: Resets all system bullets to their latest preselection defaults while keeping manual additions intact.
- **Persistent State**: The list state is stored in `descriptionOptions.draft`, ensuring exact consistency between the UI and the exported DOCX.

7.  **Export**: The `DocxGenerator` merges both parts before rendering the template.

## Key Files

- **`lib/description-logic.ts`**: The shared engine for bullet generation.
- **`lib/docx-generator.ts`**: Handles template loading, data preparation, and rendering.
- **`context/QuoteContext.tsx`**: Manages the state and provides update functions for board details.
- **`components/QuoteBuilder/BoardContent.tsx`**: The UI for previewing and editing descriptions.

## Description Logic Details

The `generateDescriptionBullets` function handles different board types:

### Main Switchboard (MSB)
- **First Bullet**: Combines Location (Indoor/Outdoor), IP Rating, Form (exact mapping), Fault Rating (exact kA), and Standard (AS61439).
- **Subsequent Bullets**: Detects items like SPD, CT Metering, Whole Current Metering, etc., based on item categories and names.

### Distribution Board (MDB/DB)
- **First Bullet**: Combines Location, IP Rating, "Wall-Mounted", Form, and Fault Rating (Icc).
- **Subsequent Bullets**: Detects Main Switch rating and optional extras (Surge, Metering, etc.).

### Meter Panel & CT Enclosure
- Follows specific authority and authority-lite structures.

## DOCX Placeholders

The following placeholders can be used in the DOCX template:

- `{{created_by}}`: Full name of the quote creator.
- `{{created_by_first_name}}`: First name of the creator.
- `{{created_by_email}}`: Email of the creator.
- `{{date}}`: Today's date (formatted for AU).
- `{{quoteNumber}}`: The reference number of the quote.
- `{{boards}}`: Section containing board details.
    - `{{boardTitle}}`: Name and Type of the board.
    - `{{bullets}}`: List of description bullets.
        - `{{text}}`: The text of each bullet.

## Fixing Mappings

If a value is not mapping correctly (e.g., "3bih" showing as "3b"):
1. Check `lib/description-logic.ts`.
2. Ensure the key used (e.g., `config.form`) matches what is saved in the database.
3. Verify that no truncation or "normalization" logic is stripping the value.
