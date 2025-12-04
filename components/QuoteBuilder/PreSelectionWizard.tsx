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
    enclosureType: string; // Custom, Cubic
    material: string;      // Mild Steel, Stainless Steel
    currentRating: string;
    spd: string;
    ctMetering: string;
    ctType?: string; // S, T, W, U
    ctQuantity?: number;
    meterPanel: string;
    wholeCurrentMetering: string;
    wcType?: string;
    wcQuantity?: number;
    drawingRef: string;
    drawingRefNumber: string;
    notes: string;
    name: string;
    tierCount: number;
    baseRequired: string;
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

const ENCLOSURE_TYPES = ['Custom', 'Cubic'];

// Base materials - filtered by logic
const MATERIALS = ['Mild Steel', 'Stainless Steel - Natural Finish', 'Aluminium', 'Plastic', 'Special / Custom'];

const CURRENT_RATINGS = [
    '63A', '100A', '160A', '250A', '400A', '630A', '800A',
    '1000A', '1250A', '1600A', '2500A', '3200A', '4000A'
];

const YES_NO = ['Yes', 'No'];

const CT_TYPES = ['S', 'T', 'W', 'U'];

const WC_TYPES = ['100A wiring 1-phase', '100A wiring 3-phase'];

// --- LOGIC TABLES ---

// 2. Switchboard Type -> Default Technical Values
const TYPE_DEFAULTS: Record<string, Partial<BoardConfig>> = {
    'Main Switchboard (MSB)': { ipRating: 'IP42', form: '1', faultRating: '25kA', enclosureType: 'Custom', material: 'Mild Steel', currentRating: '63A', spd: 'Yes' },
    'Main Distribution Board (MDB)': { ipRating: 'IP43', form: '2bi', faultRating: '36kA', enclosureType: 'Custom', material: 'Stainless Steel - Natural Finish', currentRating: '100A', spd: 'No' },
    'Distribution Board (DB)': { ipRating: 'IP54', form: '3b', faultRating: '50kA', enclosureType: 'Custom', currentRating: '160A' },
    'Prewired Whole Current Meter Panel': { ipRating: 'IP55', form: '3bih', faultRating: '63kA', enclosureType: 'Custom', currentRating: '250A' },
    'Supply Authority CT Metering Enclosure 200-400A': { ipRating: 'IP56', form: '4a', faultRating: '70kA', enclosureType: 'Custom', currentRating: '400A' },
    'Tee-Off-Box Riser': { ipRating: 'IP65', form: '4b', enclosureType: 'Custom', currentRating: '630A' },
    'Tee-Off-Box End of Run': { ipRating: 'IP66', form: '4aih', enclosureType: 'Custom', currentRating: '800A' },
    'Remote Meter Panel with Test Block': { currentRating: '1000A', enclosureType: 'Custom' },
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

const FORMS = ['1', '2b', '2bi', '3b', '3bih', '4a', '4b', '4aih'];
const FAULT_RATINGS = ['25kA', '36kA', '50kA', '63kA', '70kA'];

export default function PreSelectionWizard({ isOpen, onClose, onConfirm, initialConfig }: PreSelectionWizardProps) {
    const [config, setConfig] = useState<Partial<BoardConfig>>({
        type: '',
        name: '',
        location: 'Indoor',
        ipRating: '',
        form: '',
        faultRating: '',
        enclosureType: '',
        material: '',
        currentRating: '',
        spd: '',
        ctMetering: 'No',
        ctType: 'S',
        ctQuantity: 1,
        meterPanel: 'No',
        wholeCurrentMetering: 'No',
        wcType: '100A wiring 3-phase',
        wcQuantity: 1,
        drawingRef: 'No',
        drawingRefNumber: '',
        notes: '',
        tierCount: 0,
        baseRequired: 'No'
    });

    const [validationError, setValidationError] = useState<string | null>(null);

    // Initialize with initialConfig if provided (Edit Mode)
    useEffect(() => {
        if (isOpen && initialConfig) {
            const newConfig = { ...initialConfig };

            // Migration: If enclosureType is a material (legacy), move it to material and set enclosureType to Custom
            const oldEnclosureType = initialConfig.enclosureType;
            if (oldEnclosureType && !['Custom', 'Cubic'].includes(oldEnclosureType)) {
                newConfig.material = oldEnclosureType;
                newConfig.enclosureType = 'Custom'; // Default to Custom for legacy
            }

            setConfig(prev => ({ ...prev, ...newConfig }));
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
                material: '',
                currentRating: '',
                spd: '',
                ctMetering: 'No',
                ctType: 'S',
                ctQuantity: 1,
                meterPanel: 'No',
                wholeCurrentMetering: 'No',
                wcType: '100A wiring 3-phase',
                wcQuantity: 1,
                drawingRef: 'No',
                drawingRefNumber: '',
                notes: '',
                tierCount: 0,
                baseRequired: 'No'
            });
        }
    }, [isOpen, initialConfig]);

    // --- DEPENDENCY RULES ---

    // 2. Type -> Defaults
    const handleTypeChange = (newType: string) => {
        const defaults = TYPE_DEFAULTS[newType] || {};

        setConfig(prev => ({
            ...prev,
            type: newType,
            ...defaults,
            enclosureType: defaults.enclosureType || '',
            material: defaults.material || '',
            spd: defaults.spd || '',
            name: prev.name || `${newType.split('(')[0].trim()} 01`
        }));
    };

    // 2.1 & 2.2 Enclosure Type Logic
    const getMaterialOptions = () => {
        const { enclosureType } = config;

        if (enclosureType === 'Cubic') {
            return ['Mild Steel'];
        }

        if (enclosureType === 'Custom') {
            return ['Mild Steel', 'Stainless Steel - Natural Finish', 'Special / Custom'];
        }

        return MATERIALS;
    };

    const getIpOptions = () => {
        const { enclosureType, location } = config;

        if (enclosureType === 'Cubic') {
            return ['IP42', 'IP43', 'IP44', 'IP54'];
        }

        if (enclosureType === 'Custom') {
            // Custom allows wider range
            if (location === 'Outdoor') {
                // Outdoor Custom should be high IP
                return ['IP54', 'IP55', 'IP56', 'IP65'];
            }
            return ['IP42', 'IP43', 'IP44', 'IP54', 'IP55', 'IP56', 'IP65'];
        }

        return ['IP42', 'IP43', 'IP44', 'IP54', 'IP55', 'IP56', 'IP65', 'IP66'];
    };

    // 3. Type -> Allowed Current
    const getCurrentOptions = () => {
        if (config.type && ALLOWED_CURRENTS[config.type]) {
            return ALLOWED_CURRENTS[config.type];
        }
        return CURRENT_RATINGS;
    };

    // 5. IP + Type -> Allowed Form
    const getFormOptions = () => {
        if (config.faultRating) {
            const kA = parseInt(config.faultRating.replace('kA', ''));
            if (kA >= 50) {
                return ['3b', '3bih', '4a', '4b', '4aih'];
            }
        }
        return FORMS;
    };

    // 6. Current -> Fault Suggestions
    useEffect(() => {
        if (!config.currentRating) return;
        const amps = parseInt(config.currentRating.replace('A', ''));

        if (!config.faultRating) {
            if (amps <= 160) setConfig(prev => ({ ...prev, faultRating: '25kA' }));
            else if (amps <= 400) setConfig(prev => ({ ...prev, faultRating: '36kA' }));
            else setConfig(prev => ({ ...prev, faultRating: '50kA' }));
        }
    }, [config.currentRating]);


    // --- VALIDATION ---
    useEffect(() => {
        const { enclosureType, location, ipRating, material } = config;

        // 1. Cubic + Outdoor -> Invalid
        if (enclosureType === 'Cubic' && location === 'Outdoor') {
            setValidationError('Cubic enclosures are not available for Outdoor use.');
            return;
        }

        // 2. Custom + Outdoor + Low IP -> Invalid
        if (enclosureType === 'Custom' && location === 'Outdoor') {
            if (['IP42', 'IP43'].includes(ipRating || '')) {
                setValidationError(`IP Rating ${ipRating} is too low for Outdoor Custom enclosure.`);
                return;
            }
        }

        // 3. Mild Steel + Outdoor -> Warning
        if (material === 'Mild Steel' && location === 'Outdoor') {
            setValidationError('Mild Steel is not recommended for Outdoor use.');
            return;
        }

        setValidationError(null);
    }, [config.location, config.ipRating, config.enclosureType, config.material]);


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

                            {/* Location & Enclosure */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                                    Environment & Enclosure
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Location</label>
                                        <select
                                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
                                            value={config.location}
                                            onChange={e => setConfig({ ...config, location: e.target.value, ipRating: '' })}
                                        >
                                            {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Enclosure Type</label>
                                        <select
                                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
                                            value={config.enclosureType}
                                            onChange={e => setConfig({ ...config, enclosureType: e.target.value, material: '', ipRating: '' })}
                                        >
                                            <option value="">Select...</option>
                                            {ENCLOSURE_TYPES.map(e => <option key={e} value={e}>{e}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Material</label>
                                        <select
                                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
                                            value={config.material}
                                            onChange={e => setConfig({ ...config, material: e.target.value })}
                                            disabled={!config.enclosureType}
                                        >
                                            <option value="">Select...</option>
                                            {getMaterialOptions().map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">IP Rating</label>
                                        <select
                                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
                                            value={config.ipRating}
                                            onChange={e => setConfig({ ...config, ipRating: e.target.value })}
                                            disabled={!config.enclosureType}
                                        >
                                            <option value="">Select...</option>
                                            {getIpOptions().map(ip => <option key={ip} value={ip}>{ip}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Total No. of Tiers</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="20"
                                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
                                            value={config.tierCount}
                                            onChange={e => setConfig({ ...config, tierCount: parseInt(e.target.value) || 0 })}
                                            placeholder="0"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Includes cable zones</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Base Required</label>
                                        <select
                                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
                                            value={config.baseRequired}
                                            onChange={e => setConfig({ ...config, baseRequired: e.target.value })}
                                        >
                                            {YES_NO.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">For Custom/Outdoor boards</p>
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
                                    {config.ctMetering === 'Yes' && (
                                        <>
                                            <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">CT Type</label>
                                                <select
                                                    className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
                                                    value={config.ctType}
                                                    onChange={e => setConfig({ ...config, ctType: e.target.value })}
                                                >
                                                    {CT_TYPES.map(t => <option key={t} value={t}>{t}-Type</option>)}
                                                </select>
                                            </div>
                                            <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">CT Quantity</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
                                                    value={config.ctQuantity}
                                                    onChange={e => setConfig({ ...config, ctQuantity: parseInt(e.target.value) || 1 })}
                                                />
                                            </div>
                                        </>
                                    )}
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
                                    {config.wholeCurrentMetering === 'Yes' && (
                                        <>
                                            <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Whole Current Type</label>
                                                <select
                                                    className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
                                                    value={config.wcType}
                                                    onChange={e => setConfig({ ...config, wcType: e.target.value })}
                                                >
                                                    {WC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                            <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Number of Meters</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
                                                    value={config.wcQuantity}
                                                    onChange={e => setConfig({ ...config, wcQuantity: parseInt(e.target.value) || 1 })}
                                                />
                                            </div>
                                        </>
                                    )}
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
                        </div>
                    )}

                </div>

                {validationError && (
                    <div className="p-6 pt-0">
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                            <AlertCircle size={16} />
                            {validationError}
                        </div>
                    </div>
                )}

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
