'use client';

import { Shield, Flame, Ambulance, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const emergencyContacts = [
  {
    name: 'Policía',
    number: '911',
    tel: '911',
    icon: <Shield className="h-5 w-5" />,
    color: 'bg-blue-500 hover:bg-blue-600',
  },
  {
    name: 'Bomberos',
    number: '100',
    tel: '100',
    icon: <Flame className="h-5 w-5" />,
    color: 'bg-red-500 hover:bg-red-600',
  },
  {
    name: 'Ambulancia (SAME)',
    number: '107',
    tel: '107',
    icon: <Ambulance className="h-5 w-5" />,
    color: 'bg-green-500 hover:bg-green-600',
  },
  {
    name: 'Defensa Civil (Tigre)',
    number: '103',
    tel: '103',
    icon: <TriangleAlert className="h-5 w-5" />,
    color: 'bg-orange-500 hover:bg-orange-600',
  },
];

export function EmergencyContacts() {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {emergencyContacts.map((contact) => (
          <Tooltip key={contact.name}>
            <TooltipTrigger asChild>
              <a href={`tel:${contact.tel}`}>
                <Button
                  variant="default"
                  size="icon"
                  className={`h-8 w-8 rounded-full text-white ${contact.color}`}
                >
                  {contact.icon}
                  <span className="sr-only">
                    Llamar a {contact.name}: {contact.number}
                  </span>
                </Button>
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {contact.name}: {contact.number}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
