'use client';

import { useMemo } from 'react';
import { FundRequestsTable } from "@/components/pago-semanal/fund-requests-table";
import { RequestFundDialog } from "@/components/pago-semanal/request-fund-dialog";
import { useUser, useCollection } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { FundRequest } from '@/lib/types';

export default function PagoSemanalPage() {
    const { user, firestore, permissions } = useUser();
    const isAdmin = permissions.canValidate;
    
    const fundRequestsQuery = useMemo(() => {
        if (!firestore) return null;
        // Admins and supervisors see all requests. Other roles only see their own.
        if (isAdmin) {
          return query(collection(firestore, 'fundRequests'));
        }
        if (user) {
          return query(collection(firestore, 'fundRequests'), where('requesterId', '==', user.uid));
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
