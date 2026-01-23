'use client';

import { useMemo } from 'react';
import { useUser } from '@/firebase';
import { useCollection } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { UserProfile, CashAccount } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FundTransferDialog } from './fund-transfer-dialog';
import { Button } from '../ui/button';
import { Landmark, Wallet } from 'lucide-react';

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
};

function UserCashAccountCard({ profile }: { profile: UserProfile }) {
    const { firestore } = useUser();
    const accountsQuery = useMemo(
        () => firestore ? query(collection(firestore, `users/${profile.id}/cashAccounts`)) : null,
        [firestore, profile.id]
    );
    const { data: accounts, isLoading } = useCollection<CashAccount>(accountsQuery);

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
            <CardContent className="grid gap-2">
                {isLoading && (
                    <div className='space-y-2'>
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                )}
                {accounts && accounts.length > 0 ? accounts.map(account => (
                    <div key={account.id} className="flex items-center justify-between rounded-md border p-3">
                        <div className='flex items-center gap-2'>
                            <Wallet className="h-4 w-4 text-muted-foreground"/>
                            <span className="font-semibold text-muted-foreground">{account.name}</span>
                        </div>
                        <span className="font-mono text-lg font-bold">{formatCurrency(account.balance ?? 0, 'ARS')}</span>
                    </div>
                )) : (
                    <div className="text-sm text-muted-foreground text-center p-4">Este usuario no tiene cajas.</div>
                )}
            </CardContent>
            <CardFooter>
                <FundTransferDialog profile={profile} cashAccounts={accounts || []}>
                    <Button className='w-full' disabled={!accounts || accounts.length === 0}>
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
  
  const usersQuery = useMemo(
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
