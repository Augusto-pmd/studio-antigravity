'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
    const { firestore, permissions } = useUser();
    const { toast } = useToast();
    const [exchangeRate, setExchangeRate] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!firestore) return;

        const settingsRef = doc(firestore, 'settings', 'general');
        const unsubscribe = onSnapshot(settingsRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                if (data.exchangeRate) {
                    setExchangeRate(data.exchangeRate.toString());
                }
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);

    const handleSave = async () => {
        if (!firestore) return;

        const rate = parseFloat(exchangeRate);
        if (isNaN(rate) || rate <= 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ingrese un valor válido.' });
            return;
        }

        setIsSaving(true);
        try {
            const settingsRef = doc(firestore, 'settings', 'general');
            await setDoc(settingsRef, {
                exchangeRate: rate,
                lastUpdated: new Date().toISOString()
            }, { merge: true });

            toast({ title: 'Guardado', description: 'El tipo de cambio ha sido actualizado.' });
        } catch (error) {
            console.error('Error saving settings:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la configuración.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (!permissions.canSupervise) { // Assuming admin access needed
        return <div className="p-8">No tienes permisos para ver esta página.</div>;
    }

    return (
        <div className="container mx-auto py-10 max-w-2xl">
            <h1 className="text-3xl font-bold mb-6">Configuración General</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Tipo de Cambio (Dólar)</CardTitle>
                    <CardDescription>
                        Defina el valor del dólar que se utilizará por defecto en todo el sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="exchange-rate">Cotización (Venta BNA / Blue / MEP)</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                            <Input
                                id="exchange-rate"
                                type="number"
                                placeholder="0.00"
                                className="pl-7"
                                value={exchangeRate}
                                onChange={(e) => setExchangeRate(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Este valor se pre-cargará en los formularios de nuevos gastos y solicitudes.
                        </p>
                    </div>

                    <Button onClick={handleSave} disabled={isSaving || isLoading}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar Configuración
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
