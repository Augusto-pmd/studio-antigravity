'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/firebase';
import { collection, query, getDocs, where, limit, orderBy } from 'firebase/firestore';
import { Loader2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { FinancialAnalyticsService } from '@/services/financial-analytics';

export default function DebugPage() {
    const { user, firestore, permissions } = useUser();
    const [results, setResults] = useState<any[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const log = (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', data?: any) => {
        setResults(prev => [...prev.slice(-49), { text: msg, type, data, timestamp: new Date().toLocaleTimeString() }]);
    };

    const runDiagnostics = async () => {
        if (!firestore) return;
        setIsRunning(true);
        setResults([]);
        log('Starting Diagnostics...', 'info');

        try {
            // 1. Check Projects (Root)
            log('Checking Projects Collection...', 'info');
            const projectsRef = collection(firestore, 'projects');
            const projectsSnap = await getDocs(query(projectsRef, limit(5)));
            log(`Found ${projectsSnap.size} projects at root.`, projectsSnap.empty ? 'warning' : 'success');

            if (projectsSnap.empty) {
                log('CRITICAL: No projects found. System cannot function.', 'error');
                setIsRunning(false);
                return;
            }

            // 2. Check Subcollections for the first active project
            const project = projectsSnap.docs[0];
            const projectId = project.id;
            const projectData = project.data();
            log(`Analyzing Project: ${projectData.name} (${projectId})`, 'info');

            // 2a. Sales Subcollection
            try {
                const salesRef = collection(firestore, 'projects', projectId, 'sales');
                const salesSnap = await getDocs(query(salesRef, limit(1)));
                log(`Sales Subcollection: ${salesSnap.empty ? 'Empty' : 'Contains Data'}`, 'info');
            } catch (e: any) {
                log(`Sales Access Error: ${e.message}`, 'error');
            }

            // 2b. Expenses Subcollection
            try {
                const expensesRef = collection(firestore, 'projects', projectId, 'expenses');
                const expensesSnap = await getDocs(query(expensesRef, limit(1)));
                log(`Expenses Subcollection: ${expensesSnap.empty ? 'Empty' : 'Contains Data'}`, 'info', expensesSnap.empty ? null : expensesSnap.docs[0].data());
            } catch (e: any) {
                log(`Expenses Access Error: ${e.message}`, 'error');
            }

            // 3. Check ROOT Expenses (Legacy?)
            try {
                const rootExpensesRef = collection(firestore, 'expenses');
                const rootExpensesSnap = await getDocs(query(rootExpensesRef, limit(1)));
                log(`Root 'expenses' Collection: ${rootExpensesSnap.empty ? 'Not Found (Good)' : 'Found (Legacy Data?)'}`, rootExpensesSnap.empty ? 'success' : 'warning');
            } catch (e: any) {
                log(`Root Expenses Check: ${e.message}`, 'info');
            }

            // 4. Test Financial Analytics Service
            log('Testing FinancialAnalyticsService...', 'info');
            try {
                const financials = await FinancialAnalyticsService.getProjectFinancials(projectId, 2026);
                log('Financial Service Output (2026):', 'success', financials);

                if (financials.income.total === 0 && financials.costs.total === 0) {
                    log('Financials are ZERO. Checking 2025...', 'warning');
                    const financials2025 = await FinancialAnalyticsService.getProjectFinancials(projectId, 2025);
                    log('Financial Service Output (2025):', 'info', financials2025);
                }
            } catch (e: any) {
                log(`Financial Service Crash: ${e.message}`, 'error');
            }

            // 5. Test Money Flow Query (Index Check)
            log('Testing Money Flow Query (Index Check)...', 'info');
            try {
                // Determine account ID
                let accountId = 'user_cash_account';
                const cashAccountsRef = collection(firestore, 'cashAccounts');
                const cashSnap = await getDocs(query(cashAccountsRef, where('userId', '==', user?.uid), limit(1)));
                if (!cashSnap.empty) {
                    accountId = cashSnap.docs[0].id;
                }

                // Simulate Treasury Dashboard Query
                // Query: collection(treasuryTransactions), where(accountId), orderBy(date, desc)
                const txRef = collection(firestore, 'treasuryTransactions');
                const q = query(
                    txRef,
                    where('treasuryAccountId', '==', 'some_account_id'), // Dummy ID to test index presence
                    orderBy('date', 'desc'),
                    limit(1)
                );
                await getDocs(q); // This should throw if index missing
                log('Money Flow Query: Index appears OK (or query ran successfully).', 'success');
            } catch (e: any) {
                if (e.message.includes('index')) {
                    log('CRITICAL: Missing Firestore Index for Money Flow!', 'error', e.message);
                } else {
                    log(`Money Flow Query Error: ${e.message}`, 'warning');
                }
            }

        } catch (error: any) {
            log(`Unexpected Error: ${error.message}`, 'error');
        } finally {
            setIsRunning(false);
        }
    };

    if (!permissions.isSuperAdmin && !permissions.canSupervise && user?.email !== 'augusto@pmdarquitectura.com') {
        return <div className="p-8">Access Denied. Admins Only.</div>;
    }

    return (
        <div className="p-8 space-y-4 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold">System Diagnostics</h1>
            <p className="text-muted-foreground">Run this tool to diagnose production issues.</p>

            <Button onClick={runDiagnostics} disabled={isRunning}>
                {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Run Diagnostics'}
            </Button>

            <div className="space-y-2">
                {results.map((r, i) => (
                    <Card key={i} className={`border-l-4 ${r.type === 'error' ? 'border-l-red-500 bg-red-50/5' :
                            r.type === 'warning' ? 'border-l-yellow-500 bg-yellow-50/5' :
                                r.type === 'success' ? 'border-l-green-500' : 'border-l-blue-500'
                        }`}>
                        <CardContent className="p-3 flex gap-3">
                            <div className="mt-1">
                                {r.type === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                                {r.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                                {r.type === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                                {r.type === 'info' && <Loader2 className="h-4 w-4 text-blue-500" />}
                            </div>
                            <div className="flex-1 overflow-auto">
                                <div className="font-medium text-sm flex justify-between">
                                    <span>{r.text}</span>
                                    <span className="text-xs text-muted-foreground">{r.timestamp}</span>
                                </div>
                                {r.data && (
                                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                                        {JSON.stringify(r.data, null, 2)}
                                    </pre>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
