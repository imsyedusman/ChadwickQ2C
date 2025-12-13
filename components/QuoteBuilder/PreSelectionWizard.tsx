
import React, { useState, useEffect } from 'react';
import { X, Check, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BoardConfig } from '@/lib/board-item-service';
import { applyBoardPrefix } from '@/lib/board-naming';

interface PreSelectionWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (config: BoardConfig) => void;
    initialConfig?: Partial<BoardConfig>;
}

// --- CONSTANTS ---
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

const MATERIALS_ALL = [
    'Powder Coated Mild Steel',
    'Powder 316 Stainless Steel',
    '316 Stainless Steel Natural Finish',
    'Aluminium',
    'Marine Grade Aluminium'
];

const MATERIALS_CUBIC = ['Mild Steel']; // Cubic restriction

const MATERIALS_OUTDOOR_CUSTOM = [
    'Powder Coated Mild Steel',
    'Powder 316 Stainless Steel',
    '316 Stainless Steel Natural Finish'
];

const YES_NO = ['No', 'Yes'];

const IP_RATINGS = ['IP42', 'IP43', 'IP44', 'IP54', 'IP55', 'IP56', 'IP65', 'IP66'];

const CT_TYPES = ['S', 'T', 'W', 'U']; // Victorian standard
const WC_TYPES = ['100A wiring 3-phase', '100A wiring 1-phase'];

const CURRENT_RATINGS = [
    '63A', '100A', '160A', '250A', '400A', '630A', '800A',
    '1000A', '1250A', '1600A', '2000A', '2500A', '3200A', '4000A'
];

const TYPE_DEFAULTS: Record<string, Partial<BoardConfig>> = {
    'Main Switchboard (MSB)': { form: '4b', tierCount: 0 },
    'Main Distribution Board (MDB)': { form: '3b', tierCount: 0 },
    'Distribution Board (DB)': { form: '2b', tierCount: 0, currentRating: '250A' },
    'Prewired Whole Current Meter Panel': { form: '1', tierCount: 0, location: 'Indoor', enclosureType: 'Custom' },
    'Supply Authority CT Metering Enclosure 200-400A': { form: '1', tierCount: 0 },
    'Tee-Off-Box Riser': { form: '1', tierCount: 0 },
    'Tee-Off-Box End of Run': { form: '1', tierCount: 0 },
    'Remote Meter Panel with Test Block': { form: '1', tierCount: 0 },
};

// Allowed currents per type (optional filtering)
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
    const [step, setStep] = useState(1); // 1: Basics, 2: Construction, 3: Functional

    // Config State
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
        baseRequired: 'No',
        enclosureDepth: '400',
        insulationLevel: 'air',
        totalCompartments: 0,
        isOver50kA: 'No',
        isNonStandardColour: 'No'
    });

    const [validationError, setValidationError] = useState<string | null>(null);

    // Reset or Load Initial Config
    useEffect(() => {
        if (isOpen) {
            setStep(1); // Always start at step 1 on open
            if (initialConfig) {
                const newConfig = { ...initialConfig };
                // Migration: legacy enclosureType cleanup
                if (newConfig.enclosureType && !['Custom', 'Cubic'].includes(newConfig.enclosureType)) {
                    newConfig.material = newConfig.enclosureType;
                    newConfig.enclosureType = 'Custom';
                }
                setConfig(prev => ({ ...prev, ...newConfig }));
            } else {
                // Reset defaults
                setConfig({
                    type: '',
                    name: 'New Board', // Default placeholder
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
                    baseRequired: 'No',
                    enclosureDepth: '400',
                    insulationLevel: 'air',
                    totalCompartments: 0,
                    isOver50kA: 'No',
                    isNonStandardColour: 'No'
                });
            }
        }
    }, [isOpen, initialConfig]);

    // --- DEPENDENCY RULES & HELPERS ---

    // 1. Enclosure Type Logic
    const getEnclosureOptions = () => {
        // If Outdoor, ONLY Custom is allowed.
        if (config.location === 'Outdoor') return ['Custom'];
        return ENCLOSURE_TYPES;
    };

    const getMaterialOptions = () => {
        if (config.enclosureType === 'Cubic') return ['Powder Coated Mild Steel'];
        if (config.location === 'Outdoor' && config.enclosureType === 'Custom') {
            return [
                'Powder Coated Mild Steel',
                'Powder 316 Stainless Steel',
                '316 Stainless Steel Natural Finish'
            ];
        }
        return MATERIALS_ALL;
    };

    const getIpOptions = () => {
        if (config.location === 'Outdoor') return ['IP56', 'IP65']; // Outdoor default restriction (example logic, simplified per user request to imply high IP)
        // Standard logic
        const { enclosureType, location } = config;
        if (enclosureType === 'Cubic') {
            return ['IP42', 'IP43', 'IP44', 'IP54'];
        }
        if (enclosureType === 'Custom') {
            if (location === 'Outdoor') return ['IP54', 'IP55', 'IP56', 'IP65'];
            return ['IP42', 'IP43', 'IP44', 'IP54', 'IP55', 'IP56', 'IP65', 'IP66'];
        }
        return ['IP42'];
    };

    const getCurrentOptions = () => {
        if (config.type && ALLOWED_CURRENTS[config.type]) {
            return ALLOWED_CURRENTS[config.type];
        }
        return CURRENT_RATINGS;
    };

    const getFormOptions = () => {
        // Logic: High fault rating usually requires higher form, but keeping flexible
        return FORMS;
    };

    // Auto-fill defaults on Type Change
    const handleTypeChange = (newType: string) => {
        const defaults = TYPE_DEFAULTS[newType] || {};

        // Calculate new name with smart prefix swapping
        // We pass the current name (config.name) to preserve custom text if it exists
        const newName = applyBoardPrefix(newType, config.name || '');

        setConfig(prev => ({
            ...prev,
            type: newType,
            ...defaults,
            name: newName
        }));
    };

    // Enforce consistency when Location/Enclosure changes
    useEffect(() => {
        // Rule: Outdoor -> Custom Only
        if (config.location === 'Outdoor' && config.enclosureType === 'Cubic') {
            // Force reset to Custom
            setConfig(prev => ({ ...prev, enclosureType: 'Custom' }));
        }

        // Rule: Cubic -> Mild Steel Only
        if (config.enclosureType === 'Cubic') {
            if (config.material !== 'Mild Steel') {
                setConfig(prev => ({ ...prev, material: 'Mild Steel' }));
            }
            // Cubic has limited IP. If current IP is not in allowed list, reset.
            const allowedIPs = ['IP42', 'IP43', 'IP44', 'IP54'];
            if (config.ipRating && !allowedIPs.includes(config.ipRating)) {
                setConfig(prev => ({ ...prev, ipRating: '' }));
            }
        }

        // Rule: Outdoor Custom -> Strict Material List check
        if (config.location === 'Outdoor' && config.enclosureType === 'Custom') {
            if (!MATERIALS_OUTDOOR_CUSTOM.includes(config.material || '')) {
                // If current material is not in allowed list, reset it
                setConfig(prev => ({ ...prev, material: '' }));
            }
        }
    }, [config.location, config.enclosureType]);


    // --- NAVIGATION ---
    const canProceed = () => {
        if (step === 1) {
            // Must have: Type, Name, Location, Enclosure, Material
            return !!config.type && !!config.name && !!config.location && !!config.enclosureType && !!config.material;
        }
        if (step === 2) {
            return true; // Construction fields are optional/numeric
        }
        return true;
    };

    const handleNext = () => {
        if (canProceed()) setStep(prev => prev + 1);
        else setValidationError("Please complete all required fields.");
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
        setValidationError(null);
    };

    const handleConfirm = () => {
        // Final Validation
        if (!config.type || !config.name) {
            setValidationError('Board Type and Name are required.');
            return;
        }
        // Outdoor check just in case
        if (config.location === 'Outdoor' && config.enclosureType === 'Cubic') {
            setValidationError('Outdoor Cubic enclosures are not allowed.');
            return;
        }

        // Enforce Naming Convention one last time
        const finalName = applyBoardPrefix(config.type, config.name);
        // Update config locally before sending (optional, but good for consistency if we were staying open)
        // Actually we just pass the fixed config to onConfirm
        const finalConfig = { ...config, name: finalName };

        onConfirm(finalConfig as BoardConfig);
        onClose();
    };


    if (!isOpen) return null;

    // --- RENDER STEPS ---

    const renderStep1 = () => (
        <div className="space-y-6 animate-in fade-in active:fade-out duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Board Type <span className="text-red-500">*</span></label>
                    <select
                        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium text-gray-900"
                        value={config.type}
                        onChange={e => handleTypeChange(e.target.value)}
                    >
                        <option value="">Select Board Type...</option>
                        {BOARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Board Name <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium text-gray-900"
                        placeholder="e.g. MSB-01"
                        value={config.name}
                        onChange={e => setConfig({ ...config, name: e.target.value })}
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Location <span className="text-red-500">*</span></label>
                    <select
                        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium text-gray-900"
                        value={config.location}
                        onChange={e => setConfig({ ...config, location: e.target.value, ipRating: '' })} // Reset IP on location change
                    >
                        {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Enclosure Type <span className="text-red-500">*</span></label>
                    <select
                        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium text-gray-900"
                        value={config.enclosureType}
                        onChange={e => setConfig({ ...config, enclosureType: e.target.value, material: '', ipRating: '' })}
                    >
                        <option value="">Select Enclosure...</option>
                        {getEnclosureOptions().map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    {config.location === 'Outdoor' && (
                        <p className="text-[10px] text-orange-600 font-medium mt-1">Outdoor boards must be Custom.</p>
                    )}
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Material <span className="text-red-500">*</span></label>
                    <select
                        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium text-gray-900"
                        value={config.material}
                        onChange={e => setConfig({ ...config, material: e.target.value })}
                        disabled={!config.enclosureType}
                    >
                        <option value="">Select Material...</option>
                        {getMaterialOptions().map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">IP Rating</label>
                    <select
                        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium text-gray-900"
                        value={config.ipRating}
                        onChange={e => setConfig({ ...config, ipRating: e.target.value })}
                        disabled={!config.enclosureType}
                    >
                        <option value="">Select IP...</option>
                        {getIpOptions().map(ip => <option key={ip} value={ip}>{ip}</option>)}
                    </select>
                </div>

            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-orange-500 rounded-full"></div>
                    Construction Parameters
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Total No. of Tiers</label>
                        <input
                            type="number"
                            min="0"
                            max="20"
                            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900"
                            value={config.tierCount}
                            onChange={e => setConfig({ ...config, tierCount: parseInt(e.target.value) || 0 })}
                            placeholder="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">Includes cable zones + equipment tiers</p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Base Required</label>
                        <select
                            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900"
                            value={config.baseRequired}
                            onChange={e => setConfig({ ...config, baseRequired: e.target.value })}
                        >
                            {YES_NO.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Adds base implementation charge</p>
                    </div>
                </div>

                {/* Enclosure Depth - Custom Outdoor Only */}
                {config.enclosureType === 'Custom' && config.location === 'Outdoor' && (
                    <div className="mt-6 border-t border-gray-100 pt-4">
                        <div className="space-y-1 w-full md:w-1/2">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Enclosure Depth</label>
                            <select
                                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900"
                                value={config.enclosureDepth || '400'}
                                onChange={e => setConfig({ ...config, enclosureDepth: e.target.value })}
                            >
                                <option value="400">400 mm (Standard)</option>
                                <option value="600">600 mm</option>
                                <option value="800">800 mm</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Deeper enclosures require additional material cost per tier.</p>
                        </div>
                    </div>
                )}

                {/* Cubic Options */}
                {config.enclosureType === 'Cubic' && (
                    <div className="mt-6 border-t border-gray-100 pt-4 space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Total No. of Compartments</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900"
                                value={config.totalCompartments || ''}
                                onChange={e => setConfig({ ...config, totalCompartments: parseInt(e.target.value) || 0 })}
                                placeholder="0"
                            />
                            <p className="text-xs text-gray-500 mt-1">Required for Cubic pricing calculations</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Is Switchboard Over 50kA?</label>
                                <select
                                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900"
                                    value={config.isOver50kA || 'No'}
                                    onChange={e => setConfig({ ...config, isOver50kA: e.target.value })}
                                >
                                    {YES_NO.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Non-standard Colour?</label>
                                <select
                                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900"
                                    value={config.isNonStandardColour || 'No'}
                                    onChange={e => setConfig({ ...config, isNonStandardColour: e.target.value })}
                                >
                                    {YES_NO.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-700 flex items-start gap-2">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    Tiers and Base options directly affect the quantity of hardware and delivery items added to the quote.
                </p>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 max-h-[60vh] overflow-y-auto pr-2">
            {/* Electrical Specs */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-green-500 rounded-full"></div>
                    Electrical & Functional
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Current Rating</label>
                        <select
                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-green-500 outline-none"
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
                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-green-500 outline-none"
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
                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-green-500 outline-none"
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
                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-green-500 outline-none"
                            value={config.spd}
                            onChange={e => setConfig({ ...config, spd: e.target.value })}
                        >
                            {YES_NO.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Metering */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                    Metering & Accessories
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* CT Metering */}
                    <div className="bg-white p-3 rounded border border-gray-200 space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-gray-700">CT Metering</label>
                            <select
                                className="p-1 px-2 bg-white border border-gray-200 rounded text-xs text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                                value={config.ctMetering}
                                onChange={e => setConfig({ ...config, ctMetering: e.target.value })}
                            >
                                {YES_NO.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        {config.ctMetering === 'Yes' && (
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                                <div>
                                    <label className="text-[10px] text-gray-500 block">Type</label>
                                    <select
                                        className="w-full p-1.5 bg-white border border-gray-300 rounded text-xs text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                                        value={config.ctType}
                                        onChange={e => setConfig({ ...config, ctType: e.target.value })}
                                    >
                                        {CT_TYPES.map(t => <option key={t} value={t}>{t}-Type</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 block">Qty</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full p-1.5 bg-white border border-gray-300 rounded text-xs text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                                        value={config.ctQuantity}
                                        onChange={e => setConfig({ ...config, ctQuantity: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Whole Current */}
                    <div className="bg-white p-3 rounded border border-gray-200 space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-gray-700">Whole-Current</label>
                            <select
                                className="p-1 px-2 bg-white border border-gray-300 rounded text-xs text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                                value={config.wholeCurrentMetering}
                                onChange={e => setConfig({ ...config, wholeCurrentMetering: e.target.value })}
                            >
                                {YES_NO.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        {config.wholeCurrentMetering === 'Yes' && (
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                                <div className="col-span-2">
                                    <label className="text-[10px] text-gray-500 block">Type</label>
                                    <select
                                        className="w-full p-1.5 bg-white border border-gray-300 rounded text-xs text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                                        value={config.wcType}
                                        onChange={e => setConfig({ ...config, wcType: e.target.value })}
                                    >
                                        {WC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] text-gray-500 block">Number of Meters</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full p-1.5 bg-white border border-gray-300 rounded text-xs text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                                        value={config.wcQuantity}
                                        onChange={e => setConfig({ ...config, wcQuantity: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Meter Panel Included</label>
                        <select
                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                            value={config.meterPanel}
                            onChange={e => setConfig({ ...config, meterPanel: e.target.value })}
                        >
                            {YES_NO.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Drawing Ref</label>
                        <select
                            className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                            value={config.drawingRef}
                            onChange={e => setConfig({ ...config, drawingRef: e.target.value })}
                        >
                            {YES_NO.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        {config.drawingRef === 'Yes' && (
                            <input
                                type="text"
                                className="w-full mt-2 p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="Ref Number..."
                                value={config.drawingRefNumber}
                                onChange={e => setConfig({ ...config, drawingRefNumber: e.target.value })}
                            />
                        )}
                    </div>
                </div>

                <div className="mt-4">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                    <textarea
                        className="w-full p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                        rows={2}
                        placeholder="Any additional notes..."
                        value={config.notes}
                        onChange={e => setConfig({ ...config, notes: e.target.value })}
                    />
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header with Steps */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">{initialConfig ? 'Edit Board Configuration' : 'Add New Board'}</h2>
                            <p className="text-xs text-gray-500">Board Pre-Selection Wizard</p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors", step === 1 ? "bg-blue-100 text-blue-700" : "text-gray-500")}>
                            <div className="w-5 h-5 rounded-full bg-current flex items-center justify-center text-[10px] text-white font-bold">1</div>
                            Basics
                        </div>
                        <div className="h-px w-8 bg-gray-300"></div>
                        <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors", step === 2 ? "bg-orange-100 text-orange-700" : "text-gray-500")}>
                            <div className="w-5 h-5 rounded-full bg-current flex items-center justify-center text-[10px] text-white font-bold">2</div>
                            Construction
                        </div>
                        <div className="h-px w-8 bg-gray-300"></div>
                        <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors", step === 3 ? "bg-green-100 text-green-700" : "text-gray-500")}>
                            <div className="w-5 h-5 rounded-full bg-current flex items-center justify-center text-[10px] text-white font-bold">3</div>
                            Functional
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                </div>

                {/* Error Banner */}
                {validationError && (
                    <div className="px-6 pb-4 animate-in slide-in-from-bottom-2">
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                            <AlertCircle size={16} />
                            {validationError}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                    <div>
                        {step > 1 && (
                            <button
                                onClick={handleBack}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <ArrowLeft size={16} /> Back
                            </button>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>

                        {step < 3 ? (
                            <button
                                onClick={handleNext}
                                className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all flex items-center gap-2"
                            >
                                Next Step <ArrowRight size={16} />
                            </button>
                        ) : (
                            <button
                                onClick={handleConfirm}
                                className="px-6 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-all flex items-center gap-2"
                            >
                                <Check size={16} />
                                {initialConfig ? 'Save Changes' : 'Create Board'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

