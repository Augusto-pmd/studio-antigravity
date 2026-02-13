import { getHistoricalRate } from './src/lib/exchange-rate';

async function test() {
    console.log("Testing historical rate...");

    const futureDate = new Date('2025-07-20');
    console.log(`Fetching for future date: ${futureDate.toISOString()}`);

    try {
        const rate = await getHistoricalRate(futureDate);
        console.log(`Rate for ${futureDate.toISOString()}: ${rate}`);
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
