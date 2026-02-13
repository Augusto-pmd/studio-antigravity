'use client';
import { useEffect, useState } from 'react';
import { getHistoricalRate } from '@/lib/exchange-rate';

export default function TestRatePage() {
    const [rate, setRate] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState('2025-07-20');

    useEffect(() => {
        const fetch = async () => {
            const r = await getHistoricalRate(new Date(date));
            setRate(r);
            setLoading(false);
        };
        fetch();
    }, [date]);

    return (
        <div className="p-10">
            <h1>Test Rate for {date}</h1>
            {loading ? <p>Loading...</p> : <p>Rate: {rate}</p>}
        </div>
    );
}
