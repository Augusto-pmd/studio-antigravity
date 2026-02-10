'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { UserProfile, TimeLog, TaskRequest, FundRequest, Expense } from '@/lib/types';
import { UserActivityCard } from './user-activity-card';
import { Skeleton } from '../ui/skeleton';

const userProfileConverter = {
    toFirestore: (data: UserProfile): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): UserProfile => ({ ...snapshot.data(options), id: snapshot.id } as UserProfile)
};
const timeLogConverter = {
    toFirestore: (data: TimeLog): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TimeLog => ({ ...snapshot.data(options), id: snapshot.id } as TimeLog)
};
const taskRequestConverter = {
    toFirestore: (data: TaskRequest): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TaskRequest => ({ ...snapshot.data(options), id: snapshot.id } as TaskRequest)
};
const fundRequestConverter = {
    toFirestore: (data: FundRequest): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): FundRequest => ({ ...snapshot.data(options), id: snapshot.id } as FundRequest)
};

export function AuditDashboard() {
  const firestore = useFirestore();
  
  const usersQuery = useMemo(() => firestore ? query(collection(firestore, 'users').withConverter(userProfileConverter)) : null, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

  const timeLogsQuery = useMemo(() => firestore ? query(collection(firestore, 'timeLogs').withConverter(timeLogConverter)) : null, [firestore]);
  const { data: timeLogs, isLoading: isLoadingTimeLogs } = useCollection<TimeLog>(timeLogsQuery);

  const tasksQuery = useMemo(() => firestore ? query(collection(firestore, 'taskRequests').withConverter(taskRequestConverter)) : null, [firestore]);
  const { data: tasks, isLoading: isLoadingTasks } = useCollection<TaskRequest>(tasksQuery);
  
  const fundsQuery = useMemo(() => firestore ? query(collection(firestore, 'fundRequests').withConverter(fundRequestConverter)) : null, [firestore]);
  const { data: fundRequests, isLoading: isLoadingFunds } = useCollection<FundRequest>(fundsQuery);

  const isLoading = isLoadingUsers || isLoadingTimeLogs || isLoadingTasks || isLoadingFunds;

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
        {users?.map((user: UserProfile) => {
            const userTimeLogs = timeLogs?.filter((log: TimeLog) => log.userId === user.id);
            const userCreatedTasks = tasks?.filter((task: TaskRequest) => task.requesterId === user.id);
            const userAssignedTasks = tasks?.filter((task: TaskRequest) => task.assigneeId === user.id);
            const userFundRequests = fundRequests?.filter((req: FundRequest) => req.requesterId === user.id);
            
            return (
                <UserActivityCard 
                    key={user.id} 
                    user={user} 
                    timeLogs={userTimeLogs || []}
                    createdTasks={userCreatedTasks || []}
                    assignedTasks={userAssignedTasks || []}
                    fundRequests={userFundRequests || []}
                />
            )
        })}
    </div>
  );
}
