'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, Check, AlertCircle, Info } from 'lucide-react';

interface Template {
    id: string;
    name: string;
    filename: string;
    originalName: string;
    size: number;
    isDefault: boolean;
    createdAt: string;
}

export default function TemplateManager() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await fetch('/api/templates');
            if (res.ok) {
                const data = await res.json();
                setTemplates(data);
            }
        } catch (err) {
            console.error('Failed to fetch templates', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.docx')) {
            setError('Only .docx files are allowed');
            return;
        }

        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/templates', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Upload failed');
            }

            await fetchTemplates();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUploading(false);
            // Reset input
            e.target.value = '';
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;

        try {
            const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setTemplates(templates.filter(t => t.id !== id));
            }
        } catch (err) {
            console.error('Delete failed', err);
        }
    };

    const handleSetDefault = async (id: string) => {
        try {
            const res = await fetch(`/api/templates/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isDefault: true }),
            });

            if (res.ok) {
                await fetchTemplates();
            }
        } catch (err) {
            console.error('Update failed', err);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-gray-900">Template Management</h2>
                <p className="text-sm text-gray-500 mt-1">Manage DOCX templates for Quote Exports.</p>
            </div>

            {/* Upload Section */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Upload size={18} />
                    Upload New Template
                </h3>

                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                        <Upload size={18} />
                        {uploading ? 'Uploading...' : 'Select .docx File'}
                        <input
                            type="file"
                            accept=".docx"
                            onChange={handleUpload}
                            disabled={uploading}
                            className="hidden"
                        />
                    </label>
                    <span className="text-xs text-gray-400">Max size: 5MB</span>
                </div>

                {error && (
                    <div className="mt-3 text-sm text-red-600 flex items-center gap-2 bg-red-50 p-2 rounded">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}
            </div>

            {/* Template List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-700">Available Templates</h3>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading...</div>
                ) : templates.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">No templates found. Upload one to get started.</div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {templates.map((template) => (
                                <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                                        <FileText size={16} className="text-blue-500" />
                                        {template.originalName}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">
                                        {new Date(template.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {template.isDefault && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                <Check size={12} /> Default
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-2">
                                        {!template.isDefault && (
                                            <button
                                                onClick={() => handleSetDefault(template.id)}
                                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                Make Default
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(template.id)}
                                            className="text-gray-400 hover:text-red-600 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Placeholder Guide */}
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                <h3 className="text-sm font-semibold text-blue-900 mb-4 flex items-center gap-2">
                    <Info size={18} />
                    Placeholder Guide
                </h3>
                <p className="text-xs text-blue-600 mb-4">Click any placeholder to copy it to your clipboard.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div>
                        <h4 className="font-medium text-blue-800 mb-2">Header & Footer</h4>
                        <ul className="space-y-1 text-blue-700">
                            <PlaceholderItem code="{clientName}" label="Client Name" />
                            <PlaceholderItem code="{companyName}" label="Client Company" />
                            <PlaceholderItem code="{projectName}" label="Project Name" />
                            <PlaceholderItem code="{projectRef}" label="Project Reference" />
                            <PlaceholderItem code="{quoteNumber}" label="Quote Number" />
                            <PlaceholderItem code="{date}" label="Today's Date" />
                            <PlaceholderItem code="{totalPrice}" label="Total Sell Price (Ex GST)" />
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-medium text-blue-800 mb-2">Switchboard Table Loop</h4>
                        <ul className="space-y-1 text-blue-700">
                            <PlaceholderItem code="{#boards}...{/boards}" label="Start/End Board Loop" />
                            <PlaceholderItem code="{itemNo}" label="Item Number (1, 2...)" />
                            <PlaceholderItem code="{boardTitle}" label="Board Name + Type" />
                            <PlaceholderItem code="{name}" label="Board Name (Alias)" />
                            <PlaceholderItem code="{qty}" label="Quantity (1)" />
                            <PlaceholderItem code="{price}" label="Board Sell Price (Ex GST)" />
                            <li className="mt-2 text-xs opacity-80 font-semibold">Description Bullets:</li>
                            <PlaceholderItem code="{#bullets}...{/bullets}" label="Start/End Bullet Loop" />
                            <PlaceholderItem code="{text}" label="Bullet Text" />
                            <PlaceholderItem code="{description}" label="Full Description (Alias)" />
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PlaceholderItem({ code, label }: { code: string; label: string }) {
    const copyToClipboard = () => {
        navigator.clipboard.writeText(code);
        // Could add a toast here, but for now simple copy is fine
    };

    return (
        <li className="flex items-center gap-2 group cursor-pointer" onClick={copyToClipboard} title="Click to copy">
            <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 text-blue-800 font-mono text-xs group-hover:border-blue-400 group-hover:bg-blue-50 transition-colors">
                {code}
            </code>
            <span className="text-xs text-blue-600/80 group-hover:text-blue-800">- {label}</span>
        </li>
    );
}
