'use client';

import { useState, useEffect } from 'react';
import { ProjectPhase } from '@/lib/types';
import { getProjectPhases, addProjectPhase, updateProjectPhase, deleteProjectPhase } from '@/lib/services/project-tracking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, CheckCircle2, Circle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProjectRoadmapProps {
    projectId: string;
}

export function ProjectRoadmap({ projectId }: ProjectRoadmapProps) {
    const [phases, setPhases] = useState<ProjectPhase[]>([]);
    const [newPhaseName, setNewPhaseName] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadPhases();
    }, [projectId]);

    const loadPhases = async () => {
        try {
            const data = await getProjectPhases(projectId);
            setPhases(data);
        } catch (error) {
            console.error("Error loading phases:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddPhase = async () => {
        if (!newPhaseName.trim()) return;
        const newOrder = phases.length > 0 ? Math.max(...phases.map(p => p.order)) + 1 : 1;

        try {
            await addProjectPhase({
                projectId,
                name: newPhaseName,
                order: newOrder,
                status: 'PENDING'
            });
            setNewPhaseName('');
            loadPhases();
        } catch (error) {
            console.error("Error adding phase:", error);
        }
    };

    const handleStatusChange = async (phase: ProjectPhase) => {
        const nextStatus = phase.status === 'PENDING' ? 'IN_PROGRESS' : phase.status === 'IN_PROGRESS' ? 'COMPLETED' : 'PENDING';

        try {
            await updateProjectPhase(phase.id, { status: nextStatus });
            loadPhases();
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const handleDeletePhase = async (phaseId: string) => {
        if (!confirm('¿Eliminar esta fase?')) return;
        try {
            await deleteProjectPhase(phaseId);
            loadPhases();
        } catch (error) {
            console.error("Error deleting phase:", error);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Input
                    placeholder="Nueva Fase (ej. Anteproyecto)"
                    value={newPhaseName}
                    onChange={(e) => setNewPhaseName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPhase()}
                />
                <Button onClick={handleAddPhase} size="icon">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            <div className="relative border-l-2 border-muted ml-3 space-y-8 pb-4">
                {phases.map((phase) => (
                    <div key={phase.id} className="relative pl-8">
                        {/* Timeline Dot */}
                        <div
                            className={cn(
                                "absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 bg-background cursor-pointer hover:scale-110 transition-transform",
                                phase.status === 'COMPLETED' ? "border-green-500 bg-green-500" :
                                    phase.status === 'IN_PROGRESS' ? "border-blue-500 bg-blue-500 animate-pulse" :
                                        "border-muted-foreground"
                            )}
                            onClick={() => handleStatusChange(phase)}
                        >
                            {phase.status === 'COMPLETED' && <CheckCircle2 className="h-3 w-3 text-white absolute top-[-1px] left-[-1px]" />}
                        </div>

                        <div className="flex flex-col gap-1 group">
                            <div className="flex items-center justify-between">
                                <span className={cn(
                                    "text-lg font-semibold",
                                    phase.status === 'COMPLETED' && "text-muted-foreground line-through"
                                )}>
                                    {phase.name}
                                </span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeletePhase(phase.id)}>
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full border",
                                    phase.status === 'COMPLETED' ? "bg-green-100 text-green-700 border-green-200" :
                                        phase.status === 'IN_PROGRESS' ? "bg-blue-100 text-blue-700 border-blue-200" :
                                            "bg-gray-100 text-gray-700 border-gray-200"
                                )}>
                                    {phase.status === 'PENDING' ? 'Pendiente' : phase.status === 'IN_PROGRESS' ? 'En Curso' : 'Completado'}
                                </span>
                                {phase.startDate && <span>{format(new Date(phase.startDate), 'd MMM', { locale: es })}</span>}
                            </div>
                        </div>
                    </div>
                ))}

                {phases.length === 0 && !isLoading && (
                    <div className="pl-8 text-muted-foreground italic">No hay fases definidas.</div>
                )}
            </div>
        </div>
    );
}
