'use client';

import * as React from "react";
import { useYear } from "@/lib/contexts/year-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export function YearNavigator() {
    const { selectedYear, setYear, availableYears } = useYear();

    return (
        <div className="px-4 py-2">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Año Fiscal</span>
            </div>
            <Select value={selectedYear.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger className="w-full bg-background/50 border-input/50 h-9">
                    <SelectValue placeholder="Seleccionar Año" />
                </SelectTrigger>
                <SelectContent>
                    {availableYears.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                            {year}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
