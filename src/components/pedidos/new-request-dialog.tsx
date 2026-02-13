'use client';

import { useState, useTransition, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, PlusCircle } from "lucide-react";
import { useUser } from "@/firebase";
import { useCollection } from "@/firebase";
import { collection, doc, setDoc, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";
import type { UserProfile, Project, TaskRequest } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const userProfileConverter = {
    toFirestore: (data: UserProfile): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): UserProfile => ({ ...snapshot.data(options), id: snapshot.id } as UserProfile)
};

const projectConverter = {
    toFirestore: (data: Project): DocumentData => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project => ({ ...snapshot.data(options), id: snapshot.id } as Project)
};

export function NewRequestDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { user, firestore } = useUser();
  const { toast } = useToast();

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [projectId, setProjectId] = useState<string | undefined>(undefined);

  // Data Fetching
  const usersQuery = useMemo(() => (firestore ? collection(firestore, 'users').withConverter(userProfileConverter) : null), [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

  const projectsQuery = useMemo(() => (firestore ? collection(firestore, 'projects').withConverter(projectConverter) : null), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);
  
  const handleSave = () => {
    if (!firestore || !user || !title || !assigneeId) {
        toast({ variant: 'destructive', title: 'Campos Incompletos', description: 'El título y el usuario asignado son obligatorios.' });
        return;
    }
    
    startTransition(() => {
      const tasksCollection = collection(firestore, 'taskRequests');
      const taskRef = doc(tasksCollection);
      const taskId = taskRef.id;

      const selectedAssignee = users?.find((u: UserProfile) => u.id === assigneeId);

      if (!selectedAssignee) {
          toast({ variant: 'destructive', title: 'Error', description: 'El usuario asignado no es válido.' });
          return;
      }

      const taskData = {
          id: taskId,
          title,
          description: description || '',
          requesterId: user.uid,
          requesterName: user.displayName || 'Usuario Anónimo',
          assigneeId: selectedAssignee.id,
          assigneeName: selectedAssignee.fullName,
          status: 'Pendiente' as const,
          createdAt: new Date().toISOString(),
          ...(projectId && { projectId }),
      };

      setDoc(taskRef, taskData, { merge: true })
        .then(() => {
            toast({
                title: 'Pedido Creado',
                description: `Se ha asignado la tarea a ${selectedAssignee.fullName}.`,
            });
            setOpen(false);
            // Reset form
            setTitle('');
            setDescription('');
            setAssigneeId('');
            setProjectId(undefined);
        })
        .catch((error) => {
            console.error("Error writing to Firestore:", error);
            toast({
              variant: "destructive",
              title: "Error al crear",
              description: "No se pudo crear el pedido. Es posible que no tengas permisos.",
            });
        });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuevo Pedido
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Pedido o Alerta</DialogTitle>
          <DialogDescription>
            Asigne una tarea a un miembro del equipo. Recibirá una notificación y podrá hacer seguimiento.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título del Pedido</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej. Solicitar seguro de accidentes personales" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignee">Asignar a</Label>
            <Select onValueChange={setAssigneeId} value={assigneeId}>
              <SelectTrigger id="assignee" disabled={isLoadingUsers}>
                <SelectValue placeholder={isLoadingUsers ? "Cargando usuarios..." : "Seleccione un usuario"} />
              </SelectTrigger>
              <SelectContent>
                {users?.filter((u: UserProfile) => u.id !== user?.uid).map((profile: UserProfile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.fullName} ({profile.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalle aquí la tarea a realizar. Incluya toda la información necesaria para que el asignado pueda completarla."
              className="min-h-[120px]"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="project">Relacionar con Obra (Opcional)</Label>
             <Select onValueChange={(v) => setProjectId(v === 'none' ? undefined : v)} value={projectId}>
              <SelectTrigger id="project" disabled={isLoadingProjects}>
                <SelectValue placeholder={isLoadingProjects ? "Cargando obras..." : "Seleccione una obra si corresponde"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguna</SelectItem>
                {(projects || []).filter((p: Project) => p.status === 'En Curso').map((p: Project) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isPending || !title || !assigneeId}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar Pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
