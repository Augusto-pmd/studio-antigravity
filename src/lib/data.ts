import type { Project, Supplier } from "./types";

export const projects: Project[] = [
    {
      id: "obra-01",
      name: "Edificio Corporativo Central",
      client: "Tech Solutions S.A.",
      address: "Av. Corrientes 1234, CABA",
      currency: 'USD',
      status: "En Curso",
      supervisor: "Ing. Ramirez",
      budget: 500000,
      balance: 150000,
      progress: 75,
    },
    {
      id: "obra-02",
      name: "Complejo Residencial del Sol",
      client: "Inmobiliaria Futuro",
      address: "Calle Falsa 123, Pilar, PBA",
      currency: 'ARS',
      status: "En Curso",
      supervisor: "Arq. Gomez",
      budget: 120000000,
      balance: 45000000,
      progress: 40,
    },
    {
      id: "obra-03",
      name: "Remodelación Oficinas WeWork",
      client: "WeWork Argentina",
      address: "Libertador 5600, CABA",
      currency: 'USD',
      status: "Pausado",
      supervisor: "Ing. Ramirez",
      budget: 80000,
      balance: 20000,
      progress: 90,
    },
    {
      id: "obra-04",
      name: "Tienda insignia Nike",
      client: "Nike Argentina",
      address: "Alto Palermo Shopping, CABA",
      currency: 'ARS',
      status: "Completado",
      supervisor: "Arq. Fernandez",
      budget: 95000000,
      balance: 0,
      progress: 100,
    },
  ];
  
  export const monthlyExpenses = [
      { month: "Enero", total: 186000 },
      { month: "Febrero", total: 305000 },
      { month: "Marzo", total: 237000 },
      { month: "Abril", total: 173000 },
      { month: "Mayo", total: 209000 },
      { month: "Junio", total: 214000 },
      { month: "Julio", total: 345000 },
      { month: "Agosto", total: 198000 },
      { month: "Septiembre", total: 289000 },
      { month: "Octubre", total: 312000 },
      { month: "Noviembre", total: 251000 },
      { month: "Diciembre", total: 398000 },
  ];
  
  export const suppliers: Supplier[] = [
    {
      id: "prov-01",
      name: "Corralón El Amigo",
      cuit: "30-12345678-9",
      type: "Materiales",
      status: "Aprobado",
    },
    {
      id: "prov-02",
      name: "Sanitarios Mitre",
      cuit: "30-87654321-9",
      type: "Materiales",
      status: "Aprobado",
    },
    {
      id: "prov-03",
      name: "Electricidad Total S.R.L.",
      cuit: "33-55555555-5",
      type: "Mixto",
      status: "Pendiente",
    },
     {
      id: "logistica-vial",
      name: "Logística Vial Express",
      cuit: "30-11223344-5",
      type: 'Servicios',
      status: 'Aprobado',
    },
  ];
  
  export const expenseCategories = [
    { id: 'CAT-01', name: 'Materiales de Construcción' },
    { id: 'CAT-02', name: 'Mano de Obra (Subcontratos)' },
    { id: 'CAT-03', name: 'Alquiler de Maquinaria' },
    { id: 'CAT-04', name: 'Transporte y Logística' },
    { id: 'CAT-05', name: 'Tasas y Permisos Municipales' },
    { id: 'CAT-06', name: 'Servicios Profesionales (Arquitecto, Ingeniero)' },
    { id: 'CAT-07', name: 'Herramientas y Equipos Menores' },
    { id: 'CAT-08', name: 'Seguridad e Higiene' },
    { id: 'CAT-09', name: 'Viáticos y Comidas' },
    { id: 'CAT-10', name: 'Gastos Administrativos de Obra' },
    { id: 'CAT-11', name: 'Imprevistos' },
    { id: 'CAT-12', name: 'Otros' },
  ];
  
  export const userProfiles = [
    { id: "user-01", name: "Lucía Gomez", role: "Dirección", email: "lucia.gomez@pmd.com", avatar: "/avatars/01.png" },
    { id: "user-02", name: "Marcos Fernandez", role: "Supervisor", email: "marcos.fernandez@pmd.com", avatar: "/avatars/02.png" },
    { id: "user-03", name: "Ana Torres", role: "Administración", email: "ana.torres@pmd.com", avatar: "/avatars/03.png" },
    { id: "user-04", name: "Carlos Ruiz", role: "Operador", email: "carlos.ruiz@pmd.com", avatar: "/avatars/04.png" },
  ];
  
  export const fundRequests = [
    { id: 'fr-01', requester: 'Marcos Fernandez', category: 'Materiales', project: 'Complejo Residencial del Sol', date: '2024-07-15', amount: 50000, currency: 'ARS', status: 'Aprobado' },
    { id: 'fr-02', requester: 'Carlos Ruiz', category: 'Viáticos', project: 'Edificio Corporativo Central', date: '2024-07-18', amount: 8500, currency: 'ARS', status: 'Pendiente' },
    { id: 'fr-03', requester: 'Marcos Fernandez', category: 'Logística y PMD', project: 'Complejo Residencial del Sol', date: '2024-07-20', amount: 15000, currency: 'ARS', status: 'Pagado' },
    { id: 'fr-04', requester: 'Ana Torres', category: 'Caja Chica', project: 'Oficina Central', date: '2024-07-21', amount: 10000, currency: 'ARS', status: 'Rechazado' },
  ];
