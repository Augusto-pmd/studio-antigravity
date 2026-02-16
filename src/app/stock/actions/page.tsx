"use client";

import { useSearchParams } from "next/navigation";
import { MovementForm } from "@/components/stock/movement-form";

export default function StockActionsPage() {
    const searchParams = useSearchParams();
    const type = searchParams.get('type') === 'CHECK_IN' ? 'CHECK_IN' : 'CHECK_OUT';

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <MovementForm defaultType={type} />
        </div>
    );
}
