import { format } from 'date-fns';

interface ExchangeRateCache {
    [date: string]: number;
}

// Simple in-memory cache to avoid redundant network requests during a session
const rateCache: ExchangeRateCache = {};

/**
 * Fetches the historical "Blue" dollar sell rate for a given date.
 * Uses api.argentinadatos.com.
 * Falls back to the latest available rate if the specific date is missing (e.g., future dates or weekends without data).
 * @param date The date to fetch the rate for.
 * @returns The exchange rate (number).
 */
export async function getHistoricalRate(date: Date): Promise<number> {
    const dateKey = format(date, 'yyyy-MM-dd');

    // Return cached if available
    if (rateCache[dateKey]) {
        return rateCache[dateKey];
    }

    try {
        // Fetch all historical data (the API is light enough, or we could filter if API supported it efficiently)
        // argentinadatos.com/v1/cotizaciones/dolares/blue returns the full history.
        // Optimization: In a real app we might want to fetch only a range or cache this response globally.
        // For now, we fetch it once and cache the mapped results if possible, but the function signature implies per-date.
        // To be efficient, let's fetch ONCE if cache is empty, populate cache, then look up.

        // Check if we have populated the cache significantly (heuristic)
        if (Object.keys(rateCache).length === 0) {
            const response = await fetch('https://api.argentinadatos.com/v1/cotizaciones/dolares/blue');
            if (!response.ok) throw new Error('Failed to fetch rates');

            const data = await response.json();

            let latestDate = '';
            let latestRate = 0;

            data.forEach((entry: any) => {
                if (entry.fecha && entry.venta) {
                    rateCache[entry.fecha] = entry.venta;
                    if (!latestDate || entry.fecha > latestDate) {
                        latestDate = entry.fecha;
                        latestRate = entry.venta;
                    }
                }
            });

            // Store latest rate for future lookups
            if (latestRate > 0) {
                rateCache['latest'] = latestRate;
            }
        }

        // Now look up
        let rate = rateCache[dateKey];

        // 2. If not found, find the closest previous date available in cache
        if (!rate) {
            const sortedDates = Object.keys(rateCache).sort();

            // Optimization: if dateKey > last available date (FUTURE), use last available
            if (sortedDates.length > 0 && dateKey >= sortedDates[sortedDates.length - 1]) {
                return rateCache[sortedDates[sortedDates.length - 1]];
            }

            // Look for strictly previous date
            for (let i = sortedDates.length - 1; i >= 0; i--) {
                if (sortedDates[i] <= dateKey) {
                    rate = rateCache[sortedDates[i]];
                    break;
                }
            }
        }

        return rate || 0;

    } catch (error) {
        console.error("Error getting historical rate:", error);
        return 0; // Or throw, but 0 allows UI to handle "unknown" gracefully
    }
}
