import { NextResponse } from 'next/server';
import { getHistoricalRate } from '@/lib/exchange-rate';

export async function GET() {
    try {
        const date = new Date('2025-07-20T12:00:00Z');
        const rate = await getHistoricalRate(date);
        return NextResponse.json({ date: date.toISOString(), rate });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
