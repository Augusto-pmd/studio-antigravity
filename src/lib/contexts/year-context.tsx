'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface YearContextType {
    selectedYear: number;
    setYear: (year: number) => void;
    availableYears: number[];
}

const YearContext = createContext<YearContextType | undefined>(undefined);

export function YearProvider({ children }: { children: React.ReactNode }) {
    const currentYear = new Date().getFullYear();
    // Initialize with current year
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);

    // Create a range of years, e.g., from 2023 to Current + 1
    const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i); // [2023, 2024, 2025, 2026, 2027]

    const setYear = (year: number) => {
        setSelectedYear(year);
        // Optional: Persist to localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('selectedFiscalYear', year.toString());
        }
    };

    // Load from local storage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('selectedFiscalYear');
            if (saved) {
                const parsed = parseInt(saved);
                if (!isNaN(parsed) && availableYears.includes(parsed)) {
                    setSelectedYear(parsed);
                }
            }
        }
    }, []);

    return (
        <YearContext.Provider value={{ selectedYear, setYear, availableYears }}>
            {children}
        </YearContext.Provider>
    );
}

export function useYear() {
    const context = useContext(YearContext);
    if (context === undefined) {
        throw new Error('useYear must be used within a YearProvider');
    }
    return context;
}
