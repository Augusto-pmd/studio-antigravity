'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/extract-invoice-data.ts';
import '@/ai/flows/generate-dashboard-summary.ts';
import '@/ai/flows/extract-bank-statement.ts';
