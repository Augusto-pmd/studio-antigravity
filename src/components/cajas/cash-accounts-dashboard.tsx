'use client';

import { useMemo } from 'react';
import { useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { UserProfile, CashAccount } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FundTransferDialog } from './fund-transfer-dialog';
import { Button } from '../ui/button';
import { Landmark } from 'lucide-react';

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
};

function UserCashAccountCard({ profile }: { profile: UserProfile }) {
    const { firestore } = useUser();
    const accountsQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, `users/${profile.id}/cashAccounts`)) : null,
        [firestore, profile.id]
    );
    const { data: accounts, isLoading } = useCollection<CashAccount>(accountsQuery);

    const arsAccount = useMemo(() => accounts?.find(a => a.currency === 'ARS'), [accounts]);
    const usdAccount = useMemo(() => accounts?.find(a => a.currency === 'USD'), [accounts]);

    return (
        <Card>
            <CardHeader className="flex-row items-center gap-4 space-y-0">
                 <Avatar>
                    <AvatarImage src={profile.photoURL ?? undefined} />
                    <AvatarFallback>{profile.fullName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle>{profile.fullName}</CardTitle>
                    <CardDescription>{profile.email}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="grid gap-4">
                {isLoading && (
                    <div className='space-y-2'>
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-8 w-3/4" />
                    </div>
                )}
                <div className="flex items-center justify-between rounded-md border p-3">
                    <span className="font-semibold text-muted-foreground">Saldo ARS</span>
                    <span className="font-mono text-lg font-bold">{formatCurrency(arsAccount?.balance ?? 0, 'ARS')}</span>
                </div>
                 <div className="flex items-center justify-between rounded-md border p-3">
                    <span className="font-semibold text-muted-foreground">Saldo USD</span>
                    <span className="font-mono text-lg font-bold">{formatCurrency(usdAccount?.balance ?? 0, 'USD')}</span>
                </div>
            </CardContent>
            <CardFooter>
                <FundTransferDialog profile={profile} arsAccount={arsAccount} usdAccount={usdAccount}>
                    <Button className='w-full'>
                        <Landmark className="mr-2 h-4 w-4" />
                        Añadir Fondos
                    </Button>
                </FundTransferDialog>
            </CardFooter>
        </Card>
    )
}


export function CashAccountsDashboard() {
  const { firestore } = useUser();
  
  const usersQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'users')) : null),
    [firestore]
  );
  const { data: profiles, isLoading } = useCollection<UserProfile>(usersQuery);

  if (isLoading) {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-60 w-full" />
            <Skeleton className="h-60 w-full" />
            <Skeleton className="h-60 w-full" />
        </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {profiles?.map(profile => (
            <UserCashAccountCard key={profile.id} profile={profile} />
        ))}
    </div>
  );
}
