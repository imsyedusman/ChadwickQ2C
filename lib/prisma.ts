import { PrismaClient } from '@prisma/client'
import { logItemMutation } from './telemetry'

const prismaClientSingleton = () => {
    const client = new PrismaClient()

    return client.$extends({
        query: {
            item: {
                async create({ args, query }) {
                    const data = args.data as any
                    const isCleat = (data.category || '').includes('Busbar Supports') || 
                                   (data.subcategory || '').includes('Busbar Supports') || 
                                   ['1B1-CLEAT-SMALL-1', '1B1-CLEAT-SMALL-2', '1B1-CLEAT-LARGE-2', '1B1-CLEAT-LARGE-3'].includes(data.name || data.partNumber || '');
                    
                    if (isCleat && (data.isSystemManaged || data.isDefault)) {
                        const original = { isSystemManaged: data.isSystemManaged, isDefault: data.isDefault };
                        data.isSystemManaged = false;
                        data.isDefault = false;
                        
                        logItemMutation({
                            itemId: 'NEW',
                            category: data.category || 'Busbar Supports',
                            name: data.name || data.partNumber || 'Unknown Cleat',
                            action: 'CREATE',
                            result: 'INTERCEPTED',
                            reason: 'FORCED_MANUAL_CLEAT',
                            requestedState: original,
                            finalState: { isSystemManaged: false, isDefault: false },
                            timestamp: new Date().toISOString()
                        });
                    }
                    return query(args)
                },
                async update({ args, query }) {
                    const data = args.data as any
                    const isCleatUpdate = (data.category || '').includes('Busbar Supports') ||
                                         (data.subcategory || '').includes('Busbar Supports') ||
                                         (['1B1-CLEAT-SMALL-1', '1B1-CLEAT-SMALL-2', '1B1-CLEAT-LARGE-2', '1B1-CLEAT-LARGE-3'].includes(data.name || data.partNumber || ''));

                    if (isCleatUpdate && (data.isSystemManaged === true || data.isDefault === true)) {
                        const original = { isSystemManaged: data.isSystemManaged, isDefault: data.isDefault };
                        data.isSystemManaged = false;
                        data.isDefault = false;

                        logItemMutation({
                            itemId: (args.where as any).id || 'UNKNOWN',
                            category: data.category || 'Busbar Supports',
                            name: data.name || data.partNumber || 'Unknown Cleat',
                            action: 'UPDATE',
                            result: 'INTERCEPTED',
                            reason: 'FORCED_MANUAL_CLEAT_UPDATE',
                            requestedState: original,
                            finalState: { isSystemManaged: false, isDefault: false },
                            timestamp: new Date().toISOString()
                        });
                    }
                    return query(args)
                },
                async upsert({ args, query }) {
                    const createData = args.create as any;
                    const updateData = args.update as any;

                    [createData, updateData].forEach(data => {
                        if (!data) return;
                        const isCleat = (data.category || '').includes('Busbar Supports') ||
                                       (data.subcategory || '').includes('Busbar Supports') ||
                                       (['1B1-CLEAT-SMALL-1', '1B1-CLEAT-SMALL-2', '1B1-CLEAT-LARGE-2', '1B1-CLEAT-LARGE-3'].includes(data.name || data.partNumber || ''));

                        if (isCleat && (data.isSystemManaged || data.isDefault)) {
                            data.isSystemManaged = false;
                            data.isDefault = false;
                        }
                    });

                    return query(args);
                },
                async updateMany({ args, query }) {
                    const data = args.data as any;
                    if (data.isSystemManaged === true || data.isDefault === true) {
                        // For updateMany, we allow the operation but the sanitize logic in POST/PUT 
                        // and the cleanup script are the primary guards. 
                        // Overriding data here would affect ALL items in the query, which might be wrong 
                        // if the query targets both cleats and non-cleats.
                    }
                    return query(args);
                }
            }
        }
    })
}

declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prismaClient = (globalThis.prismaGlobal ?? prismaClientSingleton()) as ReturnType<typeof prismaClientSingleton>

export default prismaClient

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prismaClient
