/**
 * Centralized Telemetry for Item Mutations
 */

export interface MutationLog {
    itemId: string;
    boardId?: string;
    category: string;
    subcategory?: string | null;
    name: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'UPSERT' | 'BULK_UPDATE';
    requestedState?: any;
    finalState?: any;
    result: 'SUCCESS' | 'BLOCKED' | 'INTERCEPTED' | 'FAILED';
    reason?: string;
    timestamp: string;
}

export function logItemMutation(log: MutationLog) {
    const { action, name, result, reason, requestedState, finalState } = log;
    
    let message = `[Item Mutation] ${action} | ${name} | Result: ${result}`;
    if (reason) message += ` | Reason: ${reason}`;
    
    if (result === 'INTERCEPTED' && requestedState && finalState) {
        // Log the specific change in isSystemManaged if relevant
        if (requestedState.isSystemManaged !== finalState.isSystemManaged) {
            message += ` | Force Manual: requested.isSystemManaged=${requestedState.isSystemManaged} -> final.isSystemManaged=${finalState.isSystemManaged}`;
        }
    }

    console.log(message);
    
    // In a real production system, we might push this to a structured logging service (e.g. Axiom, Papertrail)
    // For now, stdout is captured by the host environment.
}
