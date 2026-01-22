import type { Project, Supplier, ExpenseCategory, Employee, UserProfile, Contractor, ContractorEmployee, TaskRequest } from '@/lib/types';

export const projects: Project[] = [
  { id: 'PROJ-001', name: 'Edificio Corporativo Central', client: 'Tech Solutions S.A.', address: 'Av. Corrientes 1234, CABA', currency: 'ARS', projectType: 'Comercial', status: 'En Curso', startDate: '2024-02-01', endDate: '2025-01-31', supervisor: 'Juan Pérez', budget: 2500000, balance: 500000, progress: 75 },
  { id: 'PROJ-002', name: 'Residencial Los Robles', client: 'Inmobiliaria Segura', address: 'Calle Falsa 123, Rosario', currency: 'USD', projectType: 'Residencial', status: 'Completado', startDate: '2023-01-10', endDate: '2024-06-30', supervisor: 'Maria González', budget: 1200000, balance: 0, progress: 100 },
  { id: 'PROJ-003', name: 'Centro Comercial del Sol', client: 'Retail Group LATAM', address: 'Ruta 9 km 210, Córdoba', currency: 'ARS', projectType: 'Comercial', status: 'Pausado', startDate: '2023-09-15', supervisor: 'Juan Pérez', budget: 5000000, balance: 120000, progress: 40 },
  { id: 'PROJ-004', name: 'Remodelación Oficinas PMD', client: 'PMD Consulting', address: 'Suipacha 567, CABA', currency: 'ARS', projectType: 'Oficinas', status: 'En Curso', startDate: '2024-05-20', endDate: '2024-09-30', supervisor: 'Carlos Lopez', budget: 300000, balance: 25000, progress: 90 },
  { id: 'PROJ-005', name: 'Parque Industrial Norte', client: 'Logística Global', address: 'Autopista BsAs - La Plata km 35', currency: 'USD', projectType: 'Industrial', status: 'En Curso', startDate: '2024-01-05', supervisor: 'Maria González', budget: 10000000, balance: 850000, progress: 20 },
  { id: 'PROJ-006', name: 'Viviendas Sociales "El Futuro"', client: 'Gobierno de la Provincia', address: 'Barrio El Progreso, Lote 14', currency: 'ARS', projectType: 'Vivienda Social', status: 'Cancelado', startDate: '2023-11-01', supervisor: 'Carlos Lopez', budget: 8000000, balance: 10000, progress: 10 },
];

export const suppliers: Supplier[] = [
  { id: 'SUP-01', name: 'Materiales Construcción S.A.', cuit: '30-12345678-9', email: 'ventas@matco.com', phone: '11-4555-1234', contactPerson: 'Ricardo Mollo', address: 'Av. Libertador 5500, CABA', status: 'Aprobado', type: 'Materiales', fiscalCondition: 'Responsable Inscripto' },
  { id: 'SUP-02', name: 'Ferretería El Tornillo Feliz', cuit: '30-87654321-0', email: 'info@tornillofeliz.com.ar', phone: '11-4888-5678', contactPerson: 'Ana Frank', address: 'Calle 13 456, La Plata', status: 'Aprobado', type: 'Materiales', fiscalCondition: 'Monotributista' },
  { id: 'SUP-04', name: 'Hormigones del Sur', cuit: '30-98765432-1', email: 'hds@hds.com.ar', phone: '11-4111-2345', contactPerson: 'Pedro Pica', address: 'Ruta 2 km 45, Hudson', status: 'Pendiente', type: 'Materiales', fiscalCondition: 'Responsable Inscripto' },
];

export const contractors: Contractor[] = [
    { id: 'CON-01', name: 'Servicios Eléctricos Lux', cuit: '20-23456789-3', email: 'contacto@luxservicios.com', phone: '11-4222-9876', contactPerson: 'Carlos Corriente', address: 'Av. Rivadavia 20000, CABA', status: 'Aprobado', fiscalCondition: 'Responsable Inscripto', artExpiryDate: '2024-07-01' },
    { id: 'CON-02', name: 'Contratista General Omar', cuit: '20-11223344-5', contactPerson: 'Omar S.', status: 'Rechazado', fiscalCondition: 'Monotributista', notes: 'Rechazado por falta de documentación en regla.' },
    { id: 'CON-03', name: 'Pinturas y Revestimientos SRL', cuit: '30-44556677-8', contactPerson: 'Sergio brocha', status: 'Aprobado', fiscalCondition: 'Responsable Inscripto', notes: 'Especialistas en pintura de altura.', artExpiryDate: '2025-02-10', insuranceExpiryDate: '2025-03-15' },
];

export const contractorEmployees: ContractorEmployee[] = [
    { id: 'CE-01', name: 'Miguel Servet', contractorId: 'CON-01', artExpiryDate: '2024-12-31' },
    { id: 'CE-02', name: 'Juana de Arco', contractorId: 'CON-01', artExpiryDate: '2024-08-15' },
    { id: 'CE-03', name: 'Leonardo da Vinci', contractorId: 'CON-03' },
    { id: 'CE-04', name: 'Marie Curie', contractorId: 'CON-03', artExpiryDate: '2025-05-20' },
    { id: 'CE-05', name: 'Nikola Tesla', contractorId: 'CON-03', artExpiryDate: '2024-07-25' }, // This one is about to expire
];


export const expenseCategories: ExpenseCategory[] = [
  { id: 'CAT-01', name: 'Materiales' },
  { id: 'CAT-02', name: 'Mano de Obra' },
  { id: 'CAT-03', 'name': 'Herramientas y Equipos' },
  { id: 'CAT-04', name: 'Transporte y Logística' },
  { id: 'CAT-05', name: 'Varios y Administrativos' },
];

export const monthlyExpenses = [
    { month: 'Ene', total: 1850 },
    { month: 'Feb', total: 2200 },
    { month: 'Mar', total: 1900 },
    { month: 'Abr', total: 2780 },
    { month: 'May', total: 1890 },
    { month: 'Jun', total: 2390 },
    { month: 'Jul', total: 3490 },
    { month: 'Ago', total: 2100 },
    { month: 'Sep', total: 2900 },
    { month: 'Oct', total: 3100 },
    { month: 'Nov', total: 2500 },
    { month: 'Dic', total: 2800 },
];

export const employees: Employee[] = [
  { id: 'EMP-001', name: 'Carlos Rodríguez', status: 'Activo', paymentType: 'Semanal', category: 'Albañil', dailyWage: 2500, artExpiryDate: '2025-01-15' },
  { id: 'EMP-002', name: 'Ana Lopez', status: 'Activo', paymentType: 'Diario', category: 'Pintor', dailyWage: 2200, artExpiryDate: '2024-09-30' },
  { id: 'EMP-003', name: 'Luis Martinez', status: 'Inactivo', paymentType: 'Semanal', category: 'Electricista', dailyWage: 3000 },
  { id: 'EMP-004', name: 'Laura Sanchez', status: 'Activo', paymentType: 'Semanal', category: 'Plomero', dailyWage: 2800, artExpiryDate: '2024-08-20' },
  { id: 'EMP-005', name: 'Javier Gomez', status: 'Activo', paymentType: 'Diario', category: 'Ayudante', dailyWage: 1800 },
  { id: 'EMP-006', name: 'Sofia Diaz', status: 'Activo', paymentType: 'Semanal', category: 'Jefe de Obra', dailyWage: 4500, artExpiryDate: '2025-03-01' },
  { id: 'EMP-007', name: 'Diego Fernandez', status: 'Activo', paymentType: 'Semanal', category: 'Albañil', dailyWage: 2500, artExpiryDate: '2024-07-31' },
];
