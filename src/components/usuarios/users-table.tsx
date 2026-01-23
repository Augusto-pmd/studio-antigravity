'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { UserProfile } from "@/lib/types";
import { Pencil } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { EditUserDialog } from "./edit-user-dialog";

export function UsersTable() {
  const firestore = useFirestore();
  const usersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'users') : null), [firestore]);
  const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);

  const renderSkeleton = () => (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-10 w-10 rounded-md ml-auto" /></TableCell>
    </TableRow>
  );

  return (
      <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead className="hidden md:table-cell">Rol</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <>
                  {renderSkeleton()}
                  {renderSkeleton()}
                </>
              )}
              {!isLoading && users?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No hay usuarios registrados.
                  </TableCell>
                </TableRow>
              )}
              {users?.map((user: UserProfile) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-4">
                        <Avatar>
                            <AvatarImage src={user.photoURL} />
                            <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-medium">{user.fullName}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{user.role}</TableCell>
                  <TableCell className="text-right">
                    <EditUserDialog userProfile={user}>
                        <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar Rol</span>
                        </Button>
                    </EditUserDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </div>
  );
}
