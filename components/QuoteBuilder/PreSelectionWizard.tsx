'use client';

import { useState, useEffect } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PreSelectionWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (config: BoardConfig) => void;
    initialConfig?: Partial<BoardConfig>; // For editing
}

export interface BoardConfig {
    type: string;
    location: string;
    ipRating: string;
    form: string;
    faultRating: string;
    enclosureType: string;
    currentRating: string;
    spd: string;
    ctMetering: string;
    meterPanel: string;
    wholeCurrentMetering: string;
    drawingRef: string;
    drawingRefNumber: string;
    notes: string;
    name: string;
}

// --- CONSTANTS & OPTIONS ---

const BOARD_TYPES = [
    'Main Switchboard (MSB)',
    'Main Distribution Board (MDB)',
    'Distribution Board (DB)',
    'Prewired Whole Current Meter Panel',
    'Supply Authority CT Metering Enclosure 200-400A',
    'Tee-Off-Box Riser',
    'Tee-Off-Box End of Run',
    'Remote Meter Panel with Test Block'
];

const LOCATIONS = ['Indoor', 'Outdoor'];

const IP_RATINGS = ['IP42', 'IP43', 'IP54', 'IP55', 'IP56', 'IP65', 'IP66'];

const FORMS = ['1', '2b', '2bi', '3b', '3bih', '4a', '4b', '4aih'];

const FAULT_RATINGS = ['25kA', '36kA', '50kA', '63kA', '70kA'];

const ENCLOSURES = ['Mild Steel', 'Stainless Steel', 'Aluminium', 'Plastic', 'Special / Custom'];

const CURRENT_RATINGS = [
    '63A', '100A', '160A', '250A', '400A', '630A', '800A',
    '1000A', '1250A', '1600A', '2500A', '3200A', '4000A'
];

const YES_NO = ['Yes', 'No'];

// --- LOGIC TABLES ---

// 2. Switchboard Type -> Default Technical Values
const TYPE_DEFAULTS: Record<string, Partial<BoardConfig>> = {
    'Main Switchboard (MSB)': { ipRating: 'IP42', form: '1', faultRating: '25kA', enclosureType: 'Mild Steel', currentRating: '63A', spd: 'Yes' },
    'Main Distribution Board (MDB)': { ipRating: 'IP43', form: '2bi', faultRating: '36kA', enclosureType: 'Stainless Steel', currentRating: '100A', spd: 'No' },
    'Distribution Board (DB)': { ipRating: 'IP54', form: '3b', faultRating: '50kA', currentRating: '160A' },
    'Prewired Whole Current Meter Panel': { ipRating: 'IP55', form: '3bih', faultRating: '63kA', currentRating: '250A' },
    'Supply Authority CT Metering Enclosure 200-400A': { ipRating: 'IP56', form: '4a', faultRating: '70kA', currentRating: '400A' },
    'Tee-Off-Box Riser': { ipRating: 'IP65', form: '4b', currentRating: '630A' },
    'Tee-Off-Box End of Run': { ipRating: 'IP66', form: '4aih', currentRating: '800A' },
    'Remote Meter Panel with Test Block': { currentRating: '1000A' },
};

// 3. Switchboard Type -> Allowed Current Rating
const ALLOWED_CURRENTS: Record<string, string[]> = {
    'Main Switchboard (MSB)': CURRENT_RATINGS, // All
    'Main Distribution Board (MDB)': ['100A', '160A', '250A', '400A', '630A', '800A'],
    'Distribution Board (DB)': ['63A', '100A', '160A', '250A'],
    'Prewired Whole Current Meter Panel': ['63A', '100A', '160A', '250A'],
    'Supply Authority CT Metering Enclosure 200-400A': ['250A', '400A'],
    'Tee-Off-Box Riser': ['400A', '630A'],
    'Tee-Off-Box End of Run': ['630A', '800A'],
    'Remote Meter Panel with Test Block': ['1000A', '1250A', '1600A', '2500A', '3200A', '4000A'],
};

export default function PreSelectionWizard({ isOpen, onClose, onConfirm, initialConfig }: PreSelectionWizardProps) {
    const [config, setConfig] = useState<Partial<BoardConfig>>({
        type: '',
        name: '',
        location: 'Indoor',
        ipRating: '',
        form: '',
        faultRating: '',
        enclosureType: '',
        currentRating: '',
        spd: '',
        ctMetering: 'No',
        meterPanel: 'No',
        wholeCurrentMetering: 'No',
        drawingRef: 'No',
        drawingRefNumber: '',
        notes: ''
    });

    const [validationError, setValidationError] = useState<string | null>(null);

    // Initialize with initialConfig if provided (Edit Mode)
    useEffect(() => {
        if (isOpen && initialConfig) {
            setConfig(prev => ({ ...prev, ...initialConfig }));
        } else if (isOpen && !initialConfig) {
            // Reset for new board
            setConfig({
                type: '',
                name: '',
                location: 'Indoor',
                ipRating: '',
                form: '',
                faultRating: '',
                enclosureType: '',
                currentRating: '',
                spd: '',
                ctMetering: 'No',
                meterPanel: 'No',
                wholeCurrentMetering: 'No',
                drawingRef: 'No',
                drawingRefNumber: '',
                notes: ''
            });
        }
    }, [isOpen, initialConfig]);

    // --- DEPENDENCY RULES ---

    // 2. Type -> Defaults (Only apply if Type changes and we are NOT in edit mode initial load)
    // To avoid overwriting existing edits, we only trigger this when the user interacts with the Type dropdown.
    // Handled in handleTypeChange.

    const handleTypeChange = (newType: string) => {
        const defaults = TYPE_DEFAULTS[newType] || {};

        setConfig(prev => ({
            ...prev,
            type: newType,
            // Apply defaults, but respect existing name
            ...defaults,
            // Reset fields that don't have defaults to force choice (or keep previous if compatible? Let's reset for safety)
            enclosureType: defaults.enclosureType || '',
            spd: defaults.spd || '',
            // Auto-generate name if empty
            name: prev.name || `${newType.split('(')[0].trim()} 01`
        }));
    };

    // 4. Location + IP -> Enclosure Logic (Derived Options)
    const getEnclosureOptions = () => {
        const { location, ipRating } = config;
        if (!location || !ipRating) return ENCLOSURES;

        if (location === 'Indoor') {
            if (['IP42', 'IP43', 'IP54'].includes(ipRating)) {
                return ['Mild Steel', 'Stainless Steel', 'Special / Custom'];
            }
        } else if (location === 'Outdoor') {
            if (['IP54', 'IP55', 'IP56'].includes(ipRating)) {
                return ['Stainless Steel', 'Special / Custom']; // Default Stainless
            }
            if (['IP65', 'IP66'].includes(ipRating)) {
                return ['Stainless Steel', 'Special / Custom']; // No Mild Steel
            }
        }
        return ENCLOSURES;
    };

    // 1. Location -> IP Options
    const getIpOptions = () => {
        if (config.location === 'Indoor') return ['IP42', 'IP43', 'IP54'];
        if (config.location === 'Outdoor') return ['IP54', 'IP55', 'IP56', 'IP65', 'IP66'];
        return IP_RATINGS;
    };

    // 3. Type -> Allowed Current
    const getCurrentOptions = () => {
        if (config.type && ALLOWED_CURRENTS[config.type]) {
            return ALLOWED_CURRENTS[config.type];
        }
        return CURRENT_RATINGS;
    };

    // 5. IP + Type -> Allowed Form (Simplified logic based on request)
    const getFormOptions = () => {
        // "If Fault Rating >= 50kA -> restrict Form options to 3b, 3bih, 4a, 4b, 4aih"
        if (config.faultRating) {
            const kA = parseInt(config.faultRating.replace('kA', ''));
            if (kA >= 50) {
                return ['3b', '3bih', '4a', '4b', '4aih'];
            }
        }
        return FORMS;
    };

    // 6. Current -> Fault Suggestions (Logic to run when Current changes)
    useEffect(() => {
        if (!config.currentRating) return;
        const amps = parseInt(config.currentRating.replace('A', ''));

        // Only auto-set if fault rating is empty to avoid overwriting user choice
        if (!config.faultRating) {
            if (amps <= 160) setConfig(prev => ({ ...prev, faultRating: '25kA' })); // Default low
            else if (amps <= 400) setConfig(prev => ({ ...prev, faultRating: '36kA' }));
            else setConfig(prev => ({ ...prev, faultRating: '50kA' }));
        }
    }, [config.currentRating]);


    // --- VALIDATION ---
    useEffect(() => {
        // Check for invalid combinations
        if (config.enclosureType === 'Mild Steel' && config.location === 'Outdoor') {
            setValidationError('Mild Steel is not recommended for Outdoor use.');
        } else if (config.location === 'Indoor' && ['IP55', 'IP56', 'IP65', 'IP66'].includes(config.ipRating || '')) {
            // Not strictly invalid, but unusual. User said "Allowed IP Ratings: IP42, IP43, IP54" for Indoor.
            // Let's enforce the dropdown filter, so this state shouldn't be reachable via UI, but good to check.
            if (!getIpOptions().includes(config.ipRating!)) {
                setValidationError(`IP Rating ${config.ipRating} is not valid for ${config.location} location.`);
            } else {
                setValidationError(null);
            }
        } else {
            setValidationError(null);
        }
    }, [config.location, config.ipRating, config.enclosureType]);


    const handleConfirm = () => {
        if (!config.type || !config.name) {
            alert('Please fill in Board Type and Name.');
            return;
        }
        if (validationError) {
            if (!confirm(`Warning: ${validationError}\n\nDo you want to proceed anyway?`)) return;
        }
        onConfirm(config as BoardConfig);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">{initialConfig ? 'Edit Board Configuration' : 'Add New Board'}</h2>
                        <p className="text-xs text-gray-500">Pre-Selection Wizard</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">

                    {/* 1. Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Board Type</label>
                            <select
                                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium text-gray-900"
                                value={config.type}
                                onChange={e => handleTypeChange(e.target.value)}
                            >
                                <option value="">Select Type...</option>
                                {BOARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Board Name</label>
                            <input
                                type="text"
                                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium text-gray-900"
                                placeholder="e.g. MSB-01"
                                value={config.name}
                                onChange={e => setConfig({ ...config, name: e.target.value })}
                            />
                        </div>
                    </div>

                    {config.type && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">

                            {/* Location & Environment */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                                    Environment & Enclosure
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Location</label>
                                        <select
                                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
                                            value={config.location}
                                            onChange={e => setConfig({ ...config, location: e.target.value, ipRating: '' })} // Reset IP on location change
                                        >
                                            {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">IP Rating</label>
                                        <select
                                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
                                            value={config.ipRating}
                                            onChange={e => setConfig({ ...config, ipRating: e.target.value })}
                                        >
                                            <option value="">Select...</option>
                                            {getIpOptions().map(ip => <option key={ip} value={ip}>{ip}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Enclosure Type</label>
                                        <select
                                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
                                            value={config.enclosureType}
                                            onChange={e => setConfig({ ...config, enclosureType: e.target.value })}
                                        >
                                            <option value="">Select...</option>
                                            {getEnclosureOptions().map(e => <option key={e} value={e}>{e}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Technical Specs */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <div className="w-1 h-4 bg-green-500 rounded-full"></div>
                                    Electrical Specifications
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Current Rating</label>
                                        <select
                                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
                                            value={config.currentRating}
                                            onChange={e => setConfig({ ...config, currentRating: e.target.value })}
                                        >
                                            <option value="">Select...</option>
                                            {getCurrentOptions().map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Fault Rating</label>
                                        <select
                                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
                                            value={config.faultRating}
                                            onChange={e => setConfig({ ...config, faultRating: e.target.value })}
                                        >
                                            <option value="">Select...</option>
                                            {FAULT_RATINGS.map(f => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Form of Segregation</label>
                                        <select
                                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
                                            value={config.form}
                                            onChange={e => setConfig({ ...config, form: e.target.value })}
                                        >
                                            <option value="">Select...</option>
                                            {getFormOptions().map(f => <option key={f} value={f}>Form {f}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Include SPD?</label>
                                        <select
                                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
                                            value={config.spd}
                                            onChange={e => setConfig({ ...config, spd: e.target.value })}
                                        >
                                            <option value="">Select...</option>
                                            {YES_NO.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Options */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                                    Additional Options
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">CT Metering</label>
                                        <select
                                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
                                            value={config.ctMetering}
                                            onChange={e => setConfig({ ...config, ctMetering: e.target.value })}
                                        >
                                            {YES_NO.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Meter Panel Included</label>
                                        <select
                                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
                                            value={config.meterPanel}
                                            onChange={e => setConfig({ ...config, meterPanel: e.target.value })}
                                        >
                                            {YES_NO.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Whole-Current Metering</label>
                                        <select
                                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
                                            value={config.wholeCurrentMetering}
                                            onChange={e => setConfig({ ...config, wholeCurrentMetering: e.target.value })}
                                        >
                                            {YES_NO.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Drawing Ref</label>
                                        <select
                                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
                                            value={config.drawingRef}
                                            onChange={e => setConfig({ ...config, drawingRef: e.target.value })}
                                        >
                                            {YES_NO.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    {config.drawingRef === 'Yes' && (
                                        <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Drawing Ref Number</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
                                                placeholder="e.g. DR-1234"
                                                value={config.drawingRefNumber}
                                                onChange={e => setConfig({ ...config, drawingRefNumber: e.target.value })}
                                            />
                                        </div>
                                    )}
                                    <div className="col-span-1 md:col-span-3">
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                                        <textarea
                                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
                                            rows={2}
                                            placeholder="Any additional notes..."
                                            value={config.notes}
                                            onChange={e => setConfig({ ...config, notes: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {validationError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                                    <AlertCircle size={16} />
                                    {validationError}
                                </div>
                            )}

                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!config.type}
                        className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Check size={16} />
                        {initialConfig ? 'Save Changes' : 'Create Board'}
                    </button>
                </div>
            </div>
        </div>
    );
}
