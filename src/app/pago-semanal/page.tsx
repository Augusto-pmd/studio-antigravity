'use client';

import { useMemo } from 'react';
import { FundRequestsTable } from "@/components/pago-semanal/fund-requests-table";
import { RequestFundDialog } from "@/components/pago-semanal/request-fund-dialog";
import { useUser, useCollection } from "@/firebase";
import { collection, query, where, type QueryDocumentSnapshot, type SnapshotOptions, type DocumentData } from "firebase/firestore";
import type { FundRequest } from '@/lib/types';

const fundRequestConverter = {
    toFirestore(request: FundRequest): DocumentData {
        const { id, ...data } = request;
        return data;
    },
    fromFirestore(
        snapshot: QueryDocumentSnapshot,
        options: SnapshotOptions
    ): FundRequest {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            requesterId: data.requesterId,
            requesterName: data.requesterName,
            date: data.date,
            category: data.category,
            projectId: data.projectId,
            projectName: data.projectName,
            amount: data.amount,
            currency: data.currency,
            exchangeRate: data.exchangeRate,
            status: data.status,
        };
    }
};

export default function PagoSemanalPage() {
    const { user, firestore, permissions } = useUser();
    const isAdmin = permissions.canValidate;
    
    const fundRequestsQuery = useMemo(() => {
        if (!firestore) return null;
        const coll = collection(firestore, 'fundRequests').withConverter(fundRequestConverter);
        // Admins and supervisors see all requests. Other roles only see their own.
        if (isAdmin) {
          return query(coll);
        }
        if (user) {
          return query(coll, where('requesterId', '==', user.uid));
        }
        return null;
      }, [firestore, user, isAdmin]);

    const { data: requests, isLoading } = useCollection<FundRequest>(fundRequestsQuery);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Solicitudes de Fondos</h1>
        <RequestFundDialog />
      </div>
      <p className="text-muted-foreground">
        Cree y supervise las solicitudes de dinero para gastos de la semana.
      </p>
      <FundRequestsTable requests={requests} isLoading={isLoading} />
    </div>
  );
}
