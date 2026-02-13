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
import type { UserProfile, Role } from "@/lib/types";
import { Pencil, Trash2 } from "lucide-react";
import { useFirestore, useCollection, useUser } from "@/firebase";
import { collection, type QueryDocumentSnapshot, type SnapshotOptions, type DocumentData } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EditUserDialog } from "@/components/usuarios/edit-user-dialog";
import { useMemo } from "react";
import { DeleteUserDialog } from "./delete-user-dialog";

const userProfileConverter = {
    toFirestore(profile: UserProfile): DocumentData {
        const { id, ...data } = profile;
        return data;
    },
    fromFirestore(
        snapshot: QueryDocumentSnapshot,
        options: SnapshotOptions
    ): UserProfile {
        const data = snapshot.data(options)!;
        return {
            id: snapshot.id,
            role: data.role as Role,
            fullName: data.fullName,
            email: data.email,
            photoURL: data.photoURL,
        };
    }
};

export function UsersTable() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const usersQuery = useMemo(() => (firestore ? collection(firestore, 'users').withConverter(userProfileConverter) : null), [firestore]);
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
                            <AvatarImage src={user.photoURL ?? undefined} />
                            <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-medium">{user.fullName}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                            <div className="text-sm text-muted-foreground md:hidden mt-2">
                                <span className="font-medium text-foreground">Rol:</span> {user.role}
                            </div>
                        </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{user.role}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end">
                      <EditUserDialog userProfile={user}>
                          <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Editar Rol</span>
                          </Button>
                      </EditUserDialog>
                      <DeleteUserDialog userProfile={user}>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={currentUser?.uid === user.id}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Eliminar Usuario</span>
                        </Button>
                      </DeleteUserDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </div>
  );
}
