export * from './product.interface';

export type PaymentStatus = 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Vencido' | 'Pagado';

export interface Payment {
  id: string;
  concept: string;
  amount: number;
  status: PaymentStatus;
  category: string;
  dueDate: string;
  paymentDate?: string;
  reference?: string;
  receiptUrl?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'resident' | 'treasurer';
  condominiumId?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentFilter {
  status?: PaymentStatus[];
  category?: string[];
  startDate?: string;
  endDate?: string;
}
