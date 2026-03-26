/**
 * Shared service for Board-level operations.
 * Centralizes duplication logic to ensure consistency between
 * board-level and quote-level duplication flows.
 */

export interface CloneBoardOptions {
    name?: string;
    quoteId?: string;
    order?: number;
}

/**
 * Prepares data for creating a cloned board from a source board.
 * Ensures strict deep-copy of JSON fields and preservation of all
 * description-related metadata and manual edits.
 */
export function prepareBoardCloneData(sourceBoard: any, overrides: CloneBoardOptions = {}) {
    // 1. Precise Selection of Fields to Copy
    // We explicitly map these to avoid accidental leaks or missing fields.
    const baseData: any = {
        name: overrides.name ?? sourceBoard.name,
        order: overrides.order ?? (overrides.order === 0 ? 0 : sourceBoard.order),
        type: sourceBoard.type,
        config: sourceBoard.config,
        mccbVariant: sourceBoard.mccbVariant,
        isOptional: sourceBoard.isOptional,
        
        // --- Description Preservation Block ---
        description: sourceBoard.description,
        internalNotes: sourceBoard.internalNotes,
        useCustomDescription: sourceBoard.useCustomDescription,
        hideAutoDescription: sourceBoard.hideAutoDescription,
        customDescription: sourceBoard.customDescription,
    };

    // If quoteId is provided, add it (e.g. for top-level tx.board.create)
    // If not provided, omit it (e.g. for nested tx.quote.create { boards: { create: [...] } })
    if (overrides.quoteId) {
        baseData.quoteId = overrides.quoteId;
    }

    // 2. Deep Copy of descriptionOptions (JSON)
    // Using JSON.parse(JSON.stringify()) is safe because descriptionOptions
    // contains only serializable data (draft bullets, editedIds).
    let clonedOptions = {};
    if (sourceBoard.descriptionOptions) {
        try {
            clonedOptions = JSON.parse(JSON.stringify(sourceBoard.descriptionOptions));
        } catch (e) {
            console.error('[BoardService] Failed to deep-copy descriptionOptions:', e);
            // Fallback to empty object if somehow corrupted, but keep it serializable
            clonedOptions = {};
        }
    }

    return {
        ...baseData,
        descriptionOptions: clonedOptions,
    };
}
