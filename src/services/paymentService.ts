import { supabase } from '../supabase/client';
import { Payment, PaymentFilter } from '../interfaces';

// Mapear los estados de pago a los valores de la base de datos
const mapPaymentStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'Pendiente': 'pendiente',
    'Aprobado': 'aprobado',
    'Rechazado': 'rechazado',
    'Vencido': 'vencido',
    'Pagado': 'pagado',
  };
  return statusMap[status] || status;
};

// Mapear los datos de la base de datos al formato de la interfaz Payment
const mapPaymentFromDB = (data: any): Payment => ({
  id: data.id.toString(),
  userId: data.usuario_id.toString(),
  condominiumId: data.vivienda_id.toString(),
  amount: data.monto,
  concept: data.concepto,
  dueDate: data.fecha_vencimiento,
  paymentDate: data.fecha_pago || undefined,
  status: data.estado,
  reference: data.referencia_pago || undefined,
  receiptUrl: data.comprobante_url || undefined,
  category: data.categoria,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

/**
 * Obtiene la lista de pagos con opciones de filtrado
 */
export const fetchPayments = async (
  userId?: string,
  filters?: PaymentFilter
): Promise<Payment[]> => {
  try {
    let query = supabase
      .from('pagos')
      .select('*')
      .order('fecha_vencimiento', { ascending: true });

    // Filtrar por usuario si se proporciona
    if (userId) {
      query = query.eq('usuario_id', parseInt(userId, 10));
    }

    // Aplicar filtros adicionales
    if (filters) {
      if (filters.status?.length) {
        const dbStatuses = filters.status.map(status => mapPaymentStatus(status));
        query = query.in('estado', dbStatuses);
      }
      if (filters.category?.length) {
        query = query.in('categoria', filters.category);
      }
      if (filters.startDate) {
        query = query.gte('fecha_vencimiento', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('fecha_vencimiento', filters.endDate);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }

    return (data || []).map(mapPaymentFromDB);
  } catch (error) {
    console.error('Error in fetchPayments:', error);
    throw error;
  }
};

/**
 * Obtiene un pago por su ID
 */
export const getPaymentById = async (id: string): Promise<Payment | null> => {
  try {
    const { data, error } = await supabase
      .from('pagos')
      .select('*')
      .eq('id', parseInt(id, 10))
      .single();

    if (error) {
      console.error('Error fetching payment:', error);
      throw error;
    }

    return data ? mapPaymentFromDB(data) : null;
  } catch (error) {
    console.error('Error in getPaymentById:', error);
    throw error;
  }
};

/**
 * Crea un nuevo pago
 */
export const createPayment = async (payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment> => {
  try {
    const paymentData = {
      usuario_id: parseInt(payment.userId, 10),
      vivienda_id: parseInt(payment.condominiumId, 10),
      monto: payment.amount,
      concepto: payment.concept,
      fecha_emision: new Date().toISOString(),
      fecha_vencimiento: payment.dueDate,
      fecha_pago: payment.paymentDate || null,
      estado: mapPaymentStatus(payment.status),
      metodo_pago: payment.reference ? 'transferencia' : null,
      referencia_pago: payment.reference || null,
      comprobante_url: payment.receiptUrl || null,
      categoria: payment.category,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('pagos')
      .insert([paymentData])
      .select()
      .single();

    if (error) {
      console.error('Error creating payment:', error);
      throw error;
    }

    return mapPaymentFromDB(data);
  } catch (error) {
    console.error('Error in createPayment:', error);
    throw error;
  }
};

/**
 * Actualiza un pago existente
 */
export const updatePayment = async (
  id: string, 
  updates: Partial<Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Payment> => {
  try {
    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Mapear los campos si es necesario
    if (updates.userId) updateData.usuario_id = parseInt(updates.userId, 10);
    if (updates.condominiumId) updateData.vivienda_id = parseInt(updates.condominiumId, 10);
    if (updates.amount) updateData.monto = updates.amount;
    if (updates.concept) updateData.concepto = updates.concept;
    if (updates.dueDate) updateData.fecha_vencimiento = updates.dueDate;
    if (updates.paymentDate) updateData.fecha_pago = updates.paymentDate;
    if (updates.status) updateData.estado = mapPaymentStatus(updates.status);
    if (updates.reference) updateData.referencia_pago = updates.reference;
    if (updates.receiptUrl) updateData.comprobante_url = updates.receiptUrl;
    if (updates.category) updateData.categoria = updates.category;

    // Eliminar campos que no existen en la base de datos
    delete updateData.userId;
    delete updateData.condominiumId;
    delete updateData.amount;
    delete updateData.concept;
    delete updateData.dueDate;
    delete updateData.paymentDate;
    delete updateData.status;
    delete updateData.reference;
    delete updateData.receiptUrl;
    delete updateData.category;

    const { data, error } = await supabase
      .from('pagos')
      .update(updateData)
      .eq('id', parseInt(id, 10))
      .select()
      .single();

    if (error) {
      console.error('Error updating payment:', error);
      throw error;
    }

    return mapPaymentFromDB(data);
  } catch (error) {
    console.error('Error in updatePayment:', error);
    throw error;
  }
};

/**
 * Elimina un pago
 */
export const deletePayment = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('pagos')
      .delete()
      .eq('id', parseInt(id, 10));

    if (error) {
      console.error('Error deleting payment:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deletePayment:', error);
    throw error;
  }
};

/**
 * Obtiene las categorías de pagos disponibles
 */
export const getPaymentCategories = async (): Promise<string[]> => {
  // Esto podría venir de la base de datos o ser estático
  return [
    'Mantenimiento',
    'Cuota Ordinaria',
    'Cuota Extraordinaria',
    'Multas',
    'Servicios',
    'Otros',
  ];
};

/**
 * Sube un comprobante de pago
 */
export const uploadReceipt = async (file: File, paymentId: string): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${paymentId}-${Date.now()}.${fileExt}`;
    const filePath = `comprobantes/${fileName}`;

    // Subir el archivo al bucket 'pagos' en Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('pagos')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error al subir el comprobante:', uploadError);
      throw uploadError;
    }

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('pagos')
      .getPublicUrl(filePath);

    // Actualizar el pago con la URL del comprobante
    await updatePayment(paymentId, { receiptUrl: publicUrl });

    return publicUrl;
  } catch (error) {
    console.error('Error uploading receipt:', error);
    throw error;
  }
};
