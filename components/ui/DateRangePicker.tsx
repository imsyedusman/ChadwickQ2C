"use client";

import * as React from "react";
import { format, subDays, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { DateRange, DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
    value: {
        from?: Date;
        to?: Date;
        preset?: string;
    };
    onChange: (value: { from?: Date; to?: Date; preset?: string }) => void;
    className?: string;
}

export function DateRangePicker({
    value,
    onChange,
    className,
}: DateRangePickerProps) {
    const [date, setDate] = React.useState<DateRange | undefined>({
        from: value.from,
        to: value.to,
    });
    const [selectedPreset, setSelectedPreset] = React.useState<string>(value.preset || "all");
    const [isOpen, setIsOpen] = React.useState(false);

    // Update internal state when props change
    React.useEffect(() => {
        setDate({ from: value.from, to: value.to });
        setSelectedPreset(value.preset || "all");
    }, [value]);

    const presets = [
        { label: "All Time", value: "all" },
        { label: "Overdue", value: "overdue" },
        { label: "Due Today", value: "today" },
        { label: "Next 7 Days", value: "next_7_days" },
        { label: "Next 14 Days", value: "next_14_days" },
        { label: "Next 30 Days", value: "next_30_days" },
        { label: "This Month", value: "this_month" },
        { label: "Custom", value: "custom" },
    ];

    const handlePresetSelect = (preset: string) => {
        setSelectedPreset(preset);
        if (preset === "all") {
            onChange({ from: undefined, to: undefined, preset: "all" });
            setIsOpen(false);
            return;
        }
        if (preset === "custom") return;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let from: Date | undefined;
        let to: Date | undefined;

        switch (preset) {
            case "overdue":
                // For overdue, we can't really show a range on the calendar easily 
                // but we can set it to a very past date to today-1
                from = subYears(today, 1);
                to = subDays(today, 1);
                break;
            case "today":
                from = today;
                to = today;
                break;
            case "next_7_days":
                from = today;
                to = subDays(new Date(today.getTime() + 7 * 86400000), 0);
                break;
            case "next_14_days":
                from = today;
                to = subDays(new Date(today.getTime() + 14 * 86400000), 0);
                break;
            case "next_30_days":
                from = today;
                to = subDays(new Date(today.getTime() + 30 * 86400000), 0);
                break;
            case "this_month":
                from = startOfMonth(today);
                to = endOfMonth(today);
                break;
        }

        if (from && to) {
            setDate({ from, to });
            onChange({ from, to, preset });
            setIsOpen(false);
        }
    };

    const handleApply = () => {
        onChange({ from: date?.from, to: date?.to, preset: "custom" });
        setIsOpen(false);
    };

    const displayDate = React.useMemo(() => {
        if (selectedPreset !== "custom" && selectedPreset !== "all") {
            return presets.find(p => p.value === selectedPreset)?.label;
        }
        if (date?.from) {
            if (date.to && !isSameDay(date.from, date.to)) {
                return `${format(date.from, "MMM dd")} - ${format(
                    date.to,
                    "MMM dd"
                )}`;
            }
            return format(date.from, "MMM dd, yyyy");
        }
        return "All Close Dates";
    }, [date, selectedPreset]);

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-full h-10 justify-start text-left font-bold italic rounded-xl border-gray-200 bg-white shadow-sm transition-all hover:bg-slate-50",
                            selectedPreset !== 'all' ? "border-amber-500 bg-amber-50/50 text-amber-700 ring-1 ring-amber-500/20" : "text-slate-700",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        <span className="truncate">{displayDate}</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl border-gray-200 shadow-2xl overflow-hidden" align="start">
                    <div className="flex flex-col sm:flex-row h-full min-h-[380px]">
                        {/* Sidebar */}
                        <div className="w-full sm:w-[160px] bg-gray-50/50 border-r border-gray-100 p-3 flex flex-col gap-1">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">Presets</div>
                            {presets.map((preset) => (
                                <button
                                    key={preset.value}
                                    onClick={() => handlePresetSelect(preset.value)}
                                    className={cn(
                                        "text-left px-3 py-2 rounded-lg text-sm font-bold transition-all",
                                        selectedPreset === preset.value
                                            ? "bg-white text-blue-600 shadow-sm border border-gray-100"
                                            : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
                                    )}
                                >
                                    {preset.label}
                                </button>
                            ))}
                            <div className="mt-auto pt-4">
                                <Button 
                                    onClick={handleApply}
                                    disabled={!date?.from}
                                    className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold rounded-xl h-10 shadow-lg"
                                >
                                    Apply
                                </Button>
                            </div>
                        </div>

                        {/* Calendar */}
                        <div className="p-4 bg-white">
                            <DayPicker
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={setDate}
                                showOutsideDays
                                className="p-0 m-0"
                                classNames={{
                                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                    month: "space-y-4",
                                    month_caption: "flex justify-center pt-1 relative items-center h-10 mb-4",
                                    caption_label: "text-sm font-bold text-gray-900",
                                    nav: "flex items-center gap-1",
                                    button_previous: cn(
                                        "absolute left-1 h-7 w-7 bg-white border border-gray-100 flex items-center justify-center rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm z-10"
                                    ),
                                    button_next: cn(
                                        "absolute right-1 h-7 w-7 bg-white border border-gray-100 flex items-center justify-center rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm z-10"
                                    ),
                                    month_grid: "w-full border-collapse space-y-1",
                                    weekdays: "flex",
                                    weekday: "text-gray-400 rounded-md w-9 font-bold text-[10px] uppercase tracking-wider text-center",
                                    week: "flex w-full mt-2",
                                    day: cn(
                                        "h-9 w-9 p-0 font-bold aria-selected:opacity-100 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors flex items-center justify-center"
                                    ),
                                    range_start: "bg-blue-600 text-white rounded-l-md hover:bg-blue-700 hover:text-white",
                                    range_end: "bg-blue-600 text-white rounded-r-md hover:bg-blue-700 hover:text-white",
                                    selected: "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white",
                                    today: "bg-slate-100 text-blue-600",
                                    outside: "text-gray-300 opacity-50",
                                    disabled: "text-gray-300 opacity-50",
                                    range_middle: "aria-selected:bg-blue-50 aria-selected:text-blue-600",
                                    hidden: "invisible",
                                }}
                                components={{
                                    Chevron: (props) => {
                                        if (props.orientation === 'left') return <ChevronLeft className="h-4 w-4" />;
                                        return <ChevronRight className="h-4 w-4" />;
                                    }
                                }}
                            />
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
