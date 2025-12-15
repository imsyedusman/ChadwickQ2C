'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, CheckCircle, AlertOctagon, RefreshCw } from 'lucide-react';

interface IntegrityIssue {
    type: 'MISSING_CODE' | 'DUPLICATE_CODE' | 'ZERO_PRICE' | 'MISSING_CATEGORY';
    severity: 'critical' | 'warning';
    message: string;
    details?: string;
    count: number;
    items?: any[];
}

export default function IntegrityReport() {
    const [loading, setLoading] = useState(false);
    const [issues, setIssues] = useState<IntegrityIssue[]>([]);
    const [lastRun, setLastRun] = useState<Date | null>(null);

    const checkIntegrity = async () => {
        setLoading(true);
        try {
            // We can re-use the catalog API or just fetch all and process client-side if dataset is small (<5000)
            // Or create a dedicated API. Let's do client-side first as it's simpler for "tiny but powerful".
            // Fetch ALL items.
            const res = await fetch('/api/catalog?take=10000');
            if (!res.ok) throw new Error('Failed to fetch catalog');

            const items: any[] = await res.json();
            const foundIssues: IntegrityIssue[] = [];

            // 1. Missing Required Codes
            const REQUIRED_CODES = [
                'MISC-SITE-RECONNECTION',
                'MISC-LABELS',
                'MISC-HARDWARE',
                '1A-TIERS', '1B-TIERS-400',
                '1B-BASE',
                '1B-SS-2B', '1B-SS-NO4',
                '1A-50KA',
                'Busbar Insulation'
            ];

            const missingCodes = REQUIRED_CODES.filter(code => !items.find(i => i.partNumber === code));
            if (missingCodes.length > 0) {
                foundIssues.push({
                    type: 'MISSING_CODE',
                    severity: 'critical',
                    message: `Missing ${missingCodes.length} required system codes.`,
                    details: missingCodes.join(', '),
                    count: missingCodes.length
                });
            }

            // 2. Duplicate Part Numbers
            const pnCounts = new Map<string, number>();
            items.forEach(i => {
                if (i.partNumber) {
                    pnCounts.set(i.partNumber, (pnCounts.get(i.partNumber) || 0) + 1);
                }
            });
            const duplicates = Array.from(pnCounts.entries()).filter(([pn, count]) => count > 1);
            if (duplicates.length > 0) {
                foundIssues.push({
                    type: 'DUPLICATE_CODE',
                    severity: 'warning', // Warning because sometimes user intends duplicates? Actually usually bad for unique matching.
                    message: `${duplicates.length} Part Numbers have duplicates.`,
                    details: duplicates.slice(0, 5).map(d => `${d[0]} (${d[1]})`).join(', ') + (duplicates.length > 5 ? '...' : ''),
                    count: duplicates.length
                });
            }

            // 3. Zero Price & Zero Labour (Flag)
            const zeroItems = items.filter(i => i.unitPrice === 0 && i.labourHours === 0 && !i.description.toLowerCase().includes('header'));
            if (zeroItems.length > 0) {
                foundIssues.push({
                    type: 'ZERO_PRICE',
                    severity: 'warning',
                    message: `${zeroItems.length} items have $0 price and 0 labour.`,
                    count: zeroItems.length,
                    items: zeroItems
                });
            }

            // 4. Missing Category
            const uncategorized = items.filter(i => !i.category || !i.subcategory);
            if (uncategorized.length > 0) {
                foundIssues.push({
                    type: 'MISSING_CATEGORY',
                    severity: 'warning',
                    message: `${uncategorized.length} items are missing category or subcategory.`,
                    count: uncategorized.length
                });
            }

            setIssues(foundIssues);
            setLastRun(new Date());

        } catch (error) {
            console.error('Integrity check failed', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div>
                    <h3 className="font-semibold text-gray-800">Catalog Integrity</h3>
                    <p className="text-xs text-gray-500">Run checks to identify data quality issues.</p>
                </div>
                <button
                    onClick={checkIntegrity}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Run Report
                </button>
            </div>

            <div className="p-6">
                {!lastRun && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        Click "Run Report" to scan the catalog.
                    </div>
                )}

                {lastRun && issues.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-green-600 gap-2">
                        <CheckCircle size={32} />
                        <span className="font-medium">All checks passed. Catalog looks healthy!</span>
                    </div>
                )}

                {issues.length > 0 && (
                    <div className="space-y-4">
                        {issues.map((issue, idx) => (
                            <div key={idx} className={`p-4 rounded-lg border flex gap-3 ${issue.severity === 'critical' ? 'bg-red-50 border-red-100' : 'bg-yellow-50 border-yellow-100'}`}>
                                <div className={`mt-0.5 ${issue.severity === 'critical' ? 'text-red-600' : 'text-yellow-600'}`}>
                                    {issue.severity === 'critical' ? <AlertOctagon size={20} /> : <AlertTriangle size={20} />}
                                </div>
                                <div>
                                    <h4 className={`text-sm font-bold ${issue.severity === 'critical' ? 'text-red-800' : 'text-yellow-800'}`}>
                                        {issue.message}
                                    </h4>
                                    {issue.details && (
                                        <p className="text-xs text-gray-600 mt-1 font-mono bg-white/50 p-1 rounded inline-block">
                                            {issue.details}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
