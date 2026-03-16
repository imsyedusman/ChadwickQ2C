const mockQuotes = [
  { id: '1', quoteNumber: 'Q26-0001', revision: 0, updatedAt: '2026-03-17T00:00:00Z', revisionGroupId: 'GRP1' },
  { id: '2', quoteNumber: 'Q26-0001-A', revision: 1, updatedAt: '2026-03-17T01:00:00Z', revisionGroupId: 'GRP1' },
  { id: '3', quoteNumber: 'Q26-0002', revision: 0, updatedAt: '2026-03-17T02:00:00Z', revisionGroupId: null }
];

function test(filteredQuotes) {
    const groups = {};
    
    filteredQuotes.forEach((q) => {
        // Updated Authoritative Grouping logic
        const fallbackKey = q.quoteNumber.split('-').slice(0, 2).join('-');
        const groupId = q.revisionGroupId || fallbackKey;
        
        if (!groups[groupId]) {
            groups[groupId] = [];
        }
        groups[groupId].push(q);
    });

    return Object.entries(groups).map(([groupId, quotesInGroup]) => {
        const sortedByRev = [...quotesInGroup].sort((a, b) => (a.revision || 0) - (b.revision || 0));
        const parent = sortedByRev[0];
        const children = sortedByRev.slice(1);
        const highestRevision = Math.max(...quotesInGroup.map((q) => q.revision || 0));
        
        const latestUpdate = quotesInGroup.reduce((latest, q) =>
            (new Date(q.updatedAt) > new Date(latest)) ? q.updatedAt : latest
            , quotesInGroup[0]?.updatedAt || new Date().toISOString());

        // Simulate badge logic
        const parentHasLatest = children.length === 0;
        const childrenWithLatest = children.filter(c => c.revision === highestRevision).map(c => c.id);

        return {
            baseNumber: parent.quoteNumber.replace(/-[A-Z]+$/, ''),
            parent: { id: parent.id, quoteNumber: parent.quoteNumber, hasLatest: parentHasLatest },
            children: children.map(c => ({ id: c.id, quoteNumber: c.quoteNumber, hasLatest: childrenWithLatest.includes(c.id) })),
            highestRevision
        };
    });
}

try {
    const results = test(mockQuotes);
    console.log('Result:', JSON.stringify(results, null, 2));
} catch (e) {
    console.error('FAILED:', e.message);
}
