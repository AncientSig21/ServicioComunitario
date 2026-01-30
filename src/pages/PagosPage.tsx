import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { BackToHome } from '../components/shared/BackToHome';
import { ScrollToTop } from '../components/shared/ScrollToTop';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { solicitarPago, actualizarPagoConComprobante, obtenerViviendaUsuario, subirArchivoComprobante, fetchPagos, editarPago, crearNotificacion, obtenerAbonosDisponibles, crearPagoRestante, aplicarAbonoAPagoEspecifico } from '../services/bookService';
import { supabase } from '../supabase/client';

interface Pago {
  id: number;
  concepto: string;
  monto: number;
  monto_pagado?: number;
  abono?: number; // Campo real en la BD
  fechaVencimiento: string;
  fechaPago?: string;
  estado: 'pendiente' | 'pagado' | 'vencido' | 'parcial' | 'rechazado';
  tipo: 'mantenimiento' | 'servicios' | 'multa' | 'otros';
  referencia?: string;
  metodo_pago?: string;
  comprobante_url?: string;
  comprobante_archivo_id?: number | null; // ID del archivo del comprobante
  descripcion?: string;
  motivo_rechazo?: string;
  observaciones?: string;
  usuario_nombre?: string;
  numero_apartamento?: string;
  creado_por_admin?: boolean;
}

// Datos de ejemplo - en producción vendrían de Supabase
const pagosEjemplo: Pago[] = [
  {
    id: 1,
    concepto: 'Cuota de Mantenimiento - Enero 2025',
    monto: 150.00,
    fechaVencimiento: '2025-01-10',
    fechaPago: '2025-01-08',
    estado: 'pagado',
    tipo: 'mantenimiento',
    referencia: 'REF-2025-001',
  },
  {
    id: 2,
    concepto: 'Cuota de Mantenimiento - Febrero 2025',
    monto: 150.00,
    fechaVencimiento: '2025-02-10',
    estado: 'pendiente',
    tipo: 'mantenimiento',
    referencia: 'REF-2025-002',
  },
  {
    id: 3,
    concepto: 'Servicios Comunes - Diciembre 2024',
    monto: 45.50,
    fechaVencimiento: '2024-12-15',
    fechaPago: '2024-12-14',
    estado: 'pagado',
    tipo: 'servicios',
    referencia: 'REF-2024-125',
  },
  {
    id: 4,
    concepto: 'Multa por Ruido Excesivo',
    monto: 25.00,
    fechaVencimiento: '2025-01-05',
    estado: 'vencido',
    tipo: 'multa',
    referencia: 'REF-2025-M001',
  },
  {
    id: 5,
    concepto: 'Servicios Comunes - Enero 2025',
    monto: 48.75,
    fechaVencimiento: '2025-01-20',
    estado: 'pendiente',
    tipo: 'servicios',
    referencia: 'REF-2025-003',
  },
  {
    id: 6,
    concepto: 'Cuota de Mantenimiento - Diciembre 2024',
    monto: 150.00,
    fechaVencimiento: '2024-12-10',
    fechaPago: '2024-12-12',
    estado: 'pagado',
    tipo: 'mantenimiento',
    referencia: 'REF-2024-120',
  },
];

const estadoColors = {
  pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  pagado: 'bg-green-100 text-green-800 border-green-300',
  vencido: 'bg-red-100 text-red-800 border-red-300',
  parcial: 'bg-orange-100 text-orange-800 border-orange-300',
  rechazado: 'bg-red-200 text-red-900 border-red-400',
};

const estadoLabels = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  vencido: 'Vencido',
  parcial: 'Abono',
  rechazado: 'Rechazado',
};

const tipoLabels = {
  mantenimiento: 'Mantenimiento',
  servicios: 'Servicios Comunes',
  multa: 'Multa',
  otros: 'Otros',
};

export const PagosPage = () => {
  const { user, isUserMoroso } = useAuth();
  const location = useLocation();
  const pagoIdMorosoFromState = (location.state as { pagoIdMoroso?: number })?.pagoIdMoroso;
  const [selectedEstado, setSelectedEstado] = useState<string>('todos');
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loadingPago, setLoadingPago] = useState<number | null>(null);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<Pago | null>(null);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [showPagoRestanteModal, setShowPagoRestanteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetallesModal, setShowDetallesModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abonoDisponible, setAbonoDisponible] = useState<number>(0);
  const [formPago, setFormPago] = useState({
    nombre: '',
    numero_casa: '',
    concepto: '',
    monto: '',
    referencia: '',
    descripcion: '',
    metodo_pago: '',
    comprobante: null as File | null,
  });
  const [usarAbonoEnPago, setUsarAbonoEnPago] = useState(false);
  const [formEditPago, setFormEditPago] = useState({
    concepto: '',
    monto: '',
    tipo: 'mantenimiento' as string,
    fecha_vencimiento: '',
  });
  // Solo para la tarjeta "Total Pagado": si el usuario pulsó "Reiniciar total", mostramos 0 (no afecta lista ni otros totales).
  const [pagadoMostrarCero, setPagadoMostrarCero] = useState(() => {
    if (typeof window === 'undefined' || !user?.id) return false;
    return localStorage.getItem(`pagos_pagado_mostrar_cero_${user.id}`) === '1';
  });

  const estados = ['todos', 'pendiente', 'pagado', 'vencido', 'parcial', 'rechazado'];

  useEffect(() => {
    if (user?.id && typeof window !== 'undefined') {
      setPagadoMostrarCero(localStorage.getItem(`pagos_pagado_mostrar_cero_${user.id}`) === '1');
    }
  }, [user?.id]);

  // Cargar pagos reales de la base de datos
  useEffect(() => {
    if (user?.id) {
      cargarPagos();
    }
  }, [user]);

  const cargarPagos = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);
      
      const pagosData = await fetchPagos({ usuario_id: user.id });
      
      if (!pagosData || !Array.isArray(pagosData)) {
        console.warn('fetchPagos no devolvió un array válido:', pagosData);
        setPagos([]);
        return;
      }
      
      // Mapear datos de la BD al formato esperado
      const pagosMapeados = pagosData.map((p: any) => {
        try {
          // Obtener abono (campo real en la BD)
          const montoPagado = p.abono !== undefined && p.abono !== null 
            ? parseFloat(p.abono.toString()) 
            : 0;
          
          // Mapear estado correctamente
          let estadoMapeado = p.estado || 'pendiente';
          if (estadoMapeado === 'aprobado') estadoMapeado = 'pendiente'; // Aprobado se muestra como pendiente para el usuario
          
          // Verificar si el pago está completo
          const montoTotal = parseFloat(p.monto || 0);
          
          // Solo mostrar como 'pagado' cuando el admin ya validó (estado en BD = 'pagado').
          // No marcar como pagado solo por abono >= monto, para que "pendiente de validación" se vea como pendiente.
          if (estadoMapeado === 'pagado') {
            estadoMapeado = 'pagado';
          } else if (montoPagado > 0 && montoPagado < montoTotal && estadoMapeado !== 'pagado') {
            // Si hay monto pagado pero no está completo, marcar como "parcial" para la UI
            // Nota: El enum de la BD no incluye "parcial", pero lo usamos internamente para la visualización
            estadoMapeado = 'parcial';
          }
          
          // Verificar si fue creado por administrador
          const creado_por_admin = p.observaciones?.includes('administrador') || false;
          
          return {
            id: p.id,
            concepto: p.concepto || 'Sin concepto',
            monto: parseFloat(p.monto || 0),
            monto_pagado: montoPagado,
            abono: montoPagado, // Agregar campo abono para compatibilidad
            fechaVencimiento: p.fecha_vencimiento || new Date().toISOString().split('T')[0],
            fechaPago: p.fecha_pago || undefined,
            estado: estadoMapeado as 'pendiente' | 'pagado' | 'vencido' | 'parcial' | 'rechazado',
            tipo: p.tipo || 'mantenimiento',
            referencia: p.referencia || undefined,
            metodo_pago: p.metodo_pago || undefined,
            comprobante_archivo_id: p.comprobante_archivo_id || null,
            comprobante_url: (p.archivos && Array.isArray(p.archivos) && p.archivos.length > 0) 
              ? p.archivos[0].url 
              : (p.archivos?.url || undefined),
            descripcion: p.observaciones || undefined,
            motivo_rechazo: p.estado === 'rechazado' ? p.observaciones : undefined,
            observaciones: p.observaciones || undefined,
            usuario_nombre: p.usuarios?.nombre || undefined,
            numero_apartamento: p.viviendas?.numero_apartamento || undefined,
            creado_por_admin: creado_por_admin,
          };
        } catch (err) {
          console.error('Error mapeando pago:', err, p);
          return null;
        }
      }).filter((p: Pago | null): p is Pago => p !== null) as Pago[];

      // Filtrar pagos: mostrar pagos parciales y restantes en lugar del pago del admin con abono
      const pagosFiltrados = pagosMapeados.filter((pago, _index, self) => {
        // Si es un pago creado por administrador
        if (pago.creado_por_admin) {
          // Verificar si hay pagos parciales o restantes relacionados
          const montoPagado = pago.abono !== undefined && pago.abono !== null ? pago.abono : (pago.monto_pagado || 0);
          const montoTotal = pago.monto;
          const tieneAbonoParcial = montoPagado > 0 && montoPagado < montoTotal;
          
          // Si tiene abono parcial, verificar si existen pagos "Pago Parcial" o "Restante"
          if (tieneAbonoParcial) {
            const conceptoBase = pago.concepto;
            const hayPagoParcial = self.some((p) => 
              !p.creado_por_admin && 
              p.concepto.includes(conceptoBase) && 
              p.concepto.includes('Pago Parcial')
            );
            const hayPagoRestante = self.some((p) => 
              !p.creado_por_admin && 
              p.concepto.includes(conceptoBase) && 
              p.concepto.includes('Restante')
            );
            
            // Si hay pagos parciales o restantes, ocultar el pago del admin
            // para mostrar solo los pagos parciales y restantes
            if (hayPagoParcial || hayPagoRestante) {
              return false;
            }
          }
          
          // Si está completo o no tiene abono, mostrarlo
          return true;
        }
        
        // Si es un pago de usuario (parcial o restante), siempre incluirlo
        return true;
      });
      
      setPagos(pagosFiltrados);

      // Cargar abono disponible (excedentes aprobados que se descontarán de próximas cuotas)
      try {
        const abono = await obtenerAbonosDisponibles(user.id);
        setAbonoDisponible(abono);
      } catch (abonoErr) {
        console.warn('Error obteniendo abono disponible:', abonoErr);
        setAbonoDisponible(0);
      }
    } catch (error: any) {
      console.error('Error cargando pagos:', error);
      setError(error.message || 'Error al cargar los pagos. Por favor, intenta de nuevo.');
      // No mostrar alert, solo establecer el error para que se muestre en la UI
    } finally {
      setLoading(false);
    }
  };

  const filteredPagos = selectedEstado === 'todos'
    ? pagos
    : pagos.filter(pago => pago.estado === selectedEstado);

  const pagosVencidos = pagos.filter(p => p.estado === 'vencido');
  const isMoroso = isUserMoroso();

  // Si el usuario llegó desde MorosoBlock con un pago seleccionado, abrir el modal de comprobante una sola vez
  const hasAutoOpenedMorosoRef = useRef(false);
  useEffect(() => {
    if (!pagoIdMorosoFromState || !user || pagos.length === 0 || hasAutoOpenedMorosoRef.current) return;
    const pago = pagos.find(p => p.id === pagoIdMorosoFromState);
    if (pago) {
      hasAutoOpenedMorosoRef.current = true;
      const restantePago = pago.monto - (pago.abono ?? pago.monto_pagado ?? 0);
      setPagoSeleccionado(pago);
      setFormPago({
        nombre: user.nombre || '',
        numero_casa: '',
        concepto: pago.concepto,
        monto: restantePago > 0 ? restantePago.toFixed(2) : pago.monto.toString(),
        referencia: '',
        descripcion: '',
        metodo_pago: '',
        comprobante: null,
      });
      setUsarAbonoEnPago(false);
      setShowPagoModal(true);
      window.history.replaceState({}, '', '/pagos');
    }
  }, [pagoIdMorosoFromState, user?.id, pagos]);

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatMonto = (monto: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(monto);
  };

  const handleAbrirModalPago = async (pago: Pago) => {
    if (!user) {
      alert('Debes iniciar sesión para realizar un pago');
      return;
    }
    
    // Obtener información del usuario y vivienda
    try {
      const vivienda_id = await obtenerViviendaUsuario(user.id);
      let nombreUsuario = user.nombre || '';
      let numeroCasa = '';
      
      if (vivienda_id) {
        const { data: viviendaData } = await supabase
          .from('viviendas')
          .select('numero_apartamento')
          .eq('id', vivienda_id)
          .single();
        
        if (viviendaData) {
          numeroCasa = viviendaData.numero_apartamento || '';
        }
      }
      
      const restantePago = pago.monto - (pago.abono ?? pago.monto_pagado ?? 0);
      setPagoSeleccionado(pago);
      setFormPago({ 
        nombre: nombreUsuario,
        numero_casa: numeroCasa,
        concepto: pago.concepto,
        monto: restantePago > 0 ? restantePago.toFixed(2) : pago.monto.toString(),
        referencia: '', 
        descripcion: '', 
        metodo_pago: '',
        comprobante: null 
      });
      setUsarAbonoEnPago(false);
      setShowPagoModal(true);
    } catch (error) {
      console.error('Error obteniendo información:', error);
      const restantePago = pago.monto - (pago.abono ?? pago.monto_pagado ?? 0);
      setPagoSeleccionado(pago);
      setFormPago({ 
        nombre: user.nombre || '',
        numero_casa: '',
        concepto: pago.concepto,
        monto: restantePago > 0 ? restantePago.toFixed(2) : pago.monto.toString(),
        referencia: '', 
        descripcion: '', 
        metodo_pago: '',
        comprobante: null 
      });
      setUsarAbonoEnPago(false);
      setShowPagoModal(true);
    }
  };

  const handleRealizarPago = async () => {
    if (!user || !pagoSeleccionado) return;

    // Validaciones obligatorias
    if (!formPago.nombre.trim()) {
      alert('Por favor ingresa tu nombre');
      return;
    }

    if (!formPago.numero_casa.trim()) {
      alert('Por favor ingresa el número de casa/apartamento');
      return;
    }

    if (!formPago.concepto.trim()) {
      alert('Por favor ingresa el concepto del pago');
      return;
    }

    const montoNum = parseFloat(formPago.monto || '0');
    if (montoNum < 0) {
      alert('Por favor ingresa un monto válido (no negativo).');
      return;
    }
    if (!usarAbonoEnPago && montoNum <= 0) {
      alert('Por favor ingresa un monto mayor a 0, o marca "Usar mi abono disponible" si quieres pagar con tu abono.');
      return;
    }

    if (!formPago.referencia.trim()) {
      alert('Por favor ingresa la referencia del pago');
      return;
    }

    if (!formPago.descripcion.trim()) {
      alert('Por favor ingresa la descripción/argumento del pago');
      return;
    }

    if (!formPago.metodo_pago.trim()) {
      alert('Por favor selecciona el método de pago');
      return;
    }

    if (!formPago.comprobante) {
      alert('Por favor adjunta el comprobante de pago');
      return;
    }

    try {
      setLoadingPago(pagoSeleccionado.id);
      
      // 1. Obtener vivienda_id del usuario
      const vivienda_id = await obtenerViviendaUsuario(user.id);
      
      if (!vivienda_id) {
        throw new Error('No se encontró una vivienda asociada a tu cuenta. Por favor, contacta a la administración.');
      }

      // 2. Subir comprobante
      let archivo_comprobante_id: number | null = null;
      if (formPago.comprobante) {
        archivo_comprobante_id = await subirArchivoComprobante(formPago.comprobante, user.id);
        if (!archivo_comprobante_id) {
          console.warn('No se pudo subir el comprobante, continuando sin él');
        }
      }

      // 3. Si el pago fue creado por administrador: actualizar el mismo pago (no crear uno nuevo).
      // Así solo existe un registro; el admin lo valida y queda completado o rechazado.
      if (pagoSeleccionado.creado_por_admin) {
        const montoIngresado = parseFloat(formPago.monto); // Monto a pagar con comprobante (puede ser 0 si usa todo el abono)
        const montoTotal = pagoSeleccionado.monto;
        let montoActualPagado = pagoSeleccionado.abono || pagoSeleccionado.monto_pagado || 0;
        const restanteInicial = montoTotal - montoActualPagado;

        // Si el usuario eligió "Usar abono disponible", aplicar ese abono al pago primero
        let abonoAplicadoDelUsuario = 0;
        if (usarAbonoEnPago && abonoDisponible > 0 && restanteInicial > 0) {
          abonoAplicadoDelUsuario = Math.min(abonoDisponible, restanteInicial);
          await aplicarAbonoAPagoEspecifico(user.id, pagoSeleccionado.id, abonoAplicadoDelUsuario);
          montoActualPagado += abonoAplicadoDelUsuario;
        }

        const restanteDespuesDeAbono = montoTotal - montoActualPagado;
        let montoAbono = montoIngresado; // Monto que paga con comprobante
        let excedente = 0;
        
        if (montoIngresado > restanteDespuesDeAbono) {
          excedente = montoIngresado - restanteDespuesDeAbono;
          montoAbono = restanteDespuesDeAbono;
          alert(`⚠️ El monto ingresado (${formatMonto(montoIngresado)}) excede el restante de la cuota (${formatMonto(restanteDespuesDeAbono)}).\n\n` +
                `Se aplicará ${formatMonto(restanteDespuesDeAbono)} al pago actual.\n` +
                `El excedente de ${formatMonto(excedente)} se guardará como abono y se aplicará a tus próximas cuotas.`);
        }
        
        if (montoAbono < 0) {
          alert('El monto a pagar no puede ser negativo');
          setLoadingPago(null);
          return;
        }
        
        // Nuevo abono acumulado en este pago (abono aplicado + monto con comprobante; excedente se aplica aparte)
        const nuevoAbono = Math.min(montoActualPagado + montoAbono, montoTotal);
        const observacionesTexto = formPago.descripcion?.trim() || '';
        const observacionesConDetalle = observacionesTexto +
          (observacionesTexto ? '\n\n' : '') +
          `Monto aplicado a esta cuota: ${formatMonto(montoAbono)}` +
          (excedente > 0 ? `. Excedente (abono para otras cuotas): ${formatMonto(excedente)}` : '');
        
        await actualizarPagoConComprobante({
          pago_id: pagoSeleccionado.id,
          usuario_id: user.id,
          referencia: formPago.referencia.trim() || null,
          metodo_pago: formPago.metodo_pago?.trim() || null,
          comprobante_archivo_id: archivo_comprobante_id ?? null,
          observaciones: observacionesConDetalle.trim() || null,
          abono: nuevoAbono,
        });
        
        if (excedente > 0) {
          try {
            await crearNotificacion(
              user.id,
              'excedente_abono',
              `Se ha registrado un excedente de ${formatMonto(excedente)} en tu pago de "${pagoSeleccionado.concepto}". El administrador lo verá al validar; al aprobar, se aplicará a tus próximas cuotas.`,
              'pagos',
              pagoSeleccionado.id,
              'Excedente registrado como abono'
            );
          } catch (notifError) {
            console.error('Error creando notificación:', notifError);
          }
          // El excedente se aplicará a próximas cuotas cuando el administrador apruebe el pago (en validarPago).
        }
        
        const quedaRestante = montoTotal - nuevoAbono > 0;
        const montoRestante = montoTotal - nuevoAbono;

        // Si hay resto por pagar, crear un pago "Restante" para que aparezca y el usuario pueda enviar comprobante
        if (quedaRestante && montoRestante > 0) {
          try {
            await crearPagoRestante({
              usuario_id: user.id,
              vivienda_id,
              parent_pago_id: pagoSeleccionado.id,
              concepto_base: pagoSeleccionado.concepto,
              monto_restante: montoRestante,
              monto_total_original: montoTotal,
              abono_ya_aplicado: nuevoAbono,
              tipo: pagoSeleccionado.tipo,
              fecha_vencimiento: pagoSeleccionado.fechaVencimiento,
            });
          } catch (errRestante) {
            console.warn('Error creando pago restante (no crítico):', errRestante);
          }
        }

        alert(
          `✅ Pago registrado correctamente.\n\n` +
          `Monto aplicado: ${formatMonto(montoAbono)}${excedente > 0 ? `\n💰 Excedente ${formatMonto(excedente)} aplicado a otras cuotas.` : ''}\n\n` +
          `Este pago queda en validación.${quedaRestante ? ` Se ha creado un pago por el restante (${formatMonto(montoRestante)}) para que puedas enviar el comprobante y validarlo.` : ' Cuando el administrador lo apruebe, quedará completado.'}`
        );
        
        setTimeout(async () => {
          try {
            await cargarPagos();
          } catch (err) {
            console.error('Error recargando pagos:', err);
            setTimeout(() => cargarPagos(), 1000);
          }
        }, 300);
      } else {
        // Verificar si es un pago restante que necesita ser actualizado
        const concepto = pagoSeleccionado.concepto || '';
        const esPagoRestante = concepto.includes('Restante');
        
        if (esPagoRestante) {
          const montoRestantePago = pagoSeleccionado.monto;
          const abonoActualRestante = pagoSeleccionado.abono ?? pagoSeleccionado.monto_pagado ?? 0;
          const restanteAPagar = montoRestantePago - abonoActualRestante;

          // Si el usuario eligió "Usar abono disponible", aplicar abono al pago Restante primero
          let abonoAplicadoRestante = 0;
          if (usarAbonoEnPago && abonoDisponible > 0 && restanteAPagar > 0) {
            abonoAplicadoRestante = Math.min(abonoDisponible, restanteAPagar);
            await aplicarAbonoAPagoEspecifico(user.id, pagoSeleccionado.id, abonoAplicadoRestante);
          }

          const montoConComprobante = parseFloat(formPago.monto || '0');
          const nuevoAbonoRestante = abonoActualRestante + abonoAplicadoRestante + montoConComprobante;

          // Actualizar el pago restante existente con todos los datos (incl. abono si se aplicó abono o monto con comprobante)
          const updateData: any = {
            referencia: formPago.referencia,
            metodo_pago: formPago.metodo_pago,
            observaciones: formPago.descripcion || pagoSeleccionado.observaciones,
            comprobante_archivo_id: archivo_comprobante_id || null,
            updated_at: new Date().toISOString()
          };
          if (abonoAplicadoRestante > 0 || montoConComprobante > 0) {
            updateData.abono = Math.min(nuevoAbonoRestante, montoRestantePago);
          }
          
          // Actualizar el archivo del comprobante si existe
          if (archivo_comprobante_id) {
            await supabase
              .from('archivos')
              .update({ entidad_id: pagoSeleccionado.id })
              .eq('id', archivo_comprobante_id);
          }
          
          const { error: updateError } = await supabase
            .from('pagos')
            .update(updateData)
            .eq('id', pagoSeleccionado.id);
          
          if (updateError) {
            throw new Error(`Error al actualizar el pago restante: ${updateError.message}`);
          }
          
          alert(`✅ Pago restante registrado exitosamente.\n\n` +
                (abonoAplicadoRestante > 0 ? `Se aplicó ${formatMonto(abonoAplicadoRestante)} de tu abono. ` : '') +
                `El pago aparecerá en la sección de validación de pagos para que el administrador lo revise.`);
        } else {
          // Si NO es un pago restante, crear un nuevo pago como antes
          await solicitarPago({
            usuario_id: user.id,
            vivienda_id: vivienda_id,
            concepto: formPago.concepto,
            monto: parseFloat(formPago.monto),
            tipo: pagoSeleccionado.tipo,
            fecha_vencimiento: pagoSeleccionado.fechaVencimiento,
            archivo_comprobante_id: archivo_comprobante_id || undefined,
            referencia: formPago.referencia,
            metodo_pago: formPago.metodo_pago,
            observaciones: formPago.descripcion,
          });
        }
      }

        // Guardar referencia antes de limpiar
      const fuePagoAdmin = pagoSeleccionado?.creado_por_admin || false;
      
      // Si fue un pago de admin, ya se mostró el mensaje arriba
      // No mostrar mensaje adicional aquí

      // 4. Cerrar modal y limpiar formulario
      setShowPagoModal(false);
      setPagoSeleccionado(null);
      setFormPago({ 
        nombre: '', 
        numero_casa: '', 
        concepto: '', 
        monto: '', 
        referencia: '', 
        descripcion: '', 
        metodo_pago: '',
        comprobante: null 
      });

      // 5. El mensaje de éxito ya se mostró arriba si fue un pago de admin
      // Solo mostrar mensaje si NO fue un pago de admin (pago nuevo creado por usuario)
      if (!fuePagoAdmin) {
        alert('✅ Pago registrado exitosamente. El administrador verificará tu pago.');
      }
      
      // 6. Recargar pagos inmediatamente y con retry si es necesario
      try {
        // Intentar recargar inmediatamente
        await cargarPagos();
      } catch (err) {
        console.error('Error recargando pagos después de registro:', err);
        // Si falla, intentar nuevamente después de un delay
        setTimeout(async () => {
          try {
            await cargarPagos();
          } catch (err2) {
            console.error('Error en segundo intento de recarga:', err2);
            setError('El pago se registró correctamente, pero hubo un problema al cargar el estado actualizado. Por favor, recarga la página manualmente.');
          }
        }, 1000);
      }
    } catch (error: any) {
      console.error('Error al realizar pago:', error);
      alert(error.message || 'Error al registrar el pago. Por favor, intenta de nuevo.');
    } finally {
      setLoadingPago(null);
    }
  };

  const handleEditarPago = async () => {
    if (!user || !pagoSeleccionado) return;

    // Verificar si el pago fue creado por administrador
    if (pagoSeleccionado.creado_por_admin) {
      alert('No puedes editar este pago porque fue creado por un administrador. Solo los administradores pueden modificar pagos creados administrativamente.');
      return;
    }

    // Verificar que el pago esté en estado pendiente
    if (pagoSeleccionado.estado !== 'pendiente') {
      alert('Solo puedes editar pagos que están en estado pendiente.');
      return;
    }

    try {
      setLoadingPago(pagoSeleccionado.id);
      
      // Subir nuevo comprobante si existe
      let archivo_comprobante_id: number | null = null;
      if (formPago.comprobante) {
        archivo_comprobante_id = await subirArchivoComprobante(formPago.comprobante, user.id);
      }

      await editarPago({
        pago_id: pagoSeleccionado.id,
        usuario_id: user.id,
        concepto: formEditPago.concepto || undefined,
        monto: formEditPago.monto ? parseFloat(formEditPago.monto) : undefined,
        tipo: formEditPago.tipo || undefined,
        fecha_vencimiento: formEditPago.fecha_vencimiento || undefined,
        archivo_comprobante_id: archivo_comprobante_id || undefined,
      });

      alert('✅ Pago actualizado exitosamente.');
      setShowEditModal(false);
      setPagoSeleccionado(null);
      setFormEditPago({ concepto: '', monto: '', tipo: 'mantenimiento', fecha_vencimiento: '' });
      await cargarPagos();
    } catch (error: any) {
      console.error('Error al editar pago:', error);
      alert(error.message || 'Error al actualizar el pago. Por favor, intenta de nuevo.');
    } finally {
      setLoadingPago(null);
    }
  };

  // Calcular total pendiente considerando pagos parciales
  // Nota: "parcial" es un estado virtual para la UI, en la BD es "pendiente" con abono > 0
  const totalPendiente = pagos.reduce((sum, p) => {
    // Usar 'abono' que es el campo real en la BD, con fallback a monto_pagado para compatibilidad
    const montoPagado = p.abono !== undefined && p.abono !== null ? p.abono : (p.monto_pagado || 0);
    const montoTotal = p.monto;
    const esParcial = p.estado === 'parcial' || (montoPagado > 0 && montoPagado < montoTotal);
    
    if (p.estado === 'pagado') {
      return sum; // Pagos completos no cuentan en pendiente
    } else if (esParcial) {
      // Para pagos parciales, solo contar lo que falta por pagar
      return sum + (montoTotal - montoPagado);
    } else {
      // Para pendientes y vencidos, contar el monto completo
      return sum + montoTotal;
    }
  }, 0);

  // Calcular total pagado (incluye pagos completos y parciales)
  const totalPagado = pagos.reduce((sum, p) => {
    const montoPagado = p.abono !== undefined && p.abono !== null ? p.abono : (p.monto_pagado || 0);
    const montoTotal = p.monto;
    const esParcial = p.estado === 'parcial' || (montoPagado > 0 && montoPagado < montoTotal);
    const esRestantePagado = p.estado === 'pagado' && (p.concepto || '').includes('Restante') && (p.observaciones || '').includes('Monto total original:');
    const montoTotalOriginalRestante = esRestantePagado && p.observaciones
      ? (() => { const m = p.observaciones.match(/Monto total original:\s*([\d.,]+)/); return m ? parseFloat(m[1].replace(',', '.')) : p.monto; })()
      : p.monto;

    if (p.estado === 'pagado') {
      return sum + (esRestantePagado ? montoTotalOriginalRestante : montoTotal);
    } else if (esParcial) {
      return sum + montoPagado;
    }
    return sum;
  }, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Cargando pagos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ScrollToTop />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <BackToHome />
          <div className="mt-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              💰 Estado de Pagos
            </h1>
            <p className="text-gray-600 text-base sm:text-lg">
              Consulta el estado de tus cuotas y pagos de Ciudad Colonial
            </p>
          </div>
        </div>

        {/* Aviso moroso: estás bloqueado; estos son los pagos por los que debes enviar comprobante */}
        {isMoroso && pagosVencidos.length > 0 && (
          <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-lg p-5">
            <h2 className="text-lg font-bold text-red-900 mb-2">
              ⚠️ Cuenta bloqueada (moroso)
            </h2>
            <p className="text-red-800 mb-3">
              Para poder ingresar al resto de la aplicación debes enviar el comprobante de pago. A continuación se muestran los pagos por los cuales estás bloqueado. Selecciona el pago correspondiente y envía el comprobante con el mismo formato de abajo.
            </p>
            <p className="text-sm font-semibold text-red-900 mb-2">Pagos por los que estás bloqueado:</p>
            <ul className="list-disc list-inside space-y-1 text-red-800 mb-2">
              {pagosVencidos.map((p) => (
                <li key={p.id}>
                  <strong>{p.concepto}</strong> — {formatMonto(p.monto)} (vencimiento: {formatFecha(p.fechaVencimiento)})
                </li>
              ))}
            </ul>
            <p className="text-sm text-red-700">
              Haz clic en &quot;Enviar comprobante&quot; en el pago que corresponda a tu comprobante y completa el formulario.
            </p>
          </div>
        )}

        {/* Mostrar error si existe */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-red-800 font-semibold mb-1">⚠️ Error al cargar los pagos</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
              <button
                onClick={cargarPagos}
                className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Resumen de pagos: Total Pagado | Abono disponible (si > 0) | Total Pendiente */}
        <div className={`grid gap-4 mb-8 ${abonoDisponible > 0 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Pagado</p>
                <p className="text-2xl font-bold text-green-600">
                  {pagadoMostrarCero ? formatMonto(0) : formatMonto(totalPagado)}
                </p>
                {pagadoMostrarCero && (
                  <p className="text-xs text-gray-500 mt-1">Reiniciado (los pagos siguen en la lista)</p>
                )}
              </div>
              <div className="text-4xl">✅</div>
            </div>
            {pagadoMostrarCero ? (
              <button
                type="button"
                onClick={() => {
                  if (user?.id && typeof window !== 'undefined') {
                    localStorage.removeItem(`pagos_pagado_mostrar_cero_${user.id}`);
                    setPagadoMostrarCero(false);
                  }
                }}
                className="mt-3 text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Restaurar total
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (user?.id && typeof window !== 'undefined') {
                    localStorage.setItem(`pagos_pagado_mostrar_cero_${user.id}`, '1');
                    setPagadoMostrarCero(true);
                  }
                }}
                className="mt-3 text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Reiniciar total
              </button>
            )}
          </div>
          {abonoDisponible > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Abono disponible</p>
                  <p className="text-2xl font-bold text-blue-600">{formatMonto(abonoDisponible)}</p>
                  <p className="text-xs text-gray-500 mt-1">Se descontará de tu próxima cuota pendiente o del pago que cree el administrador.</p>
                </div>
                <div className="text-4xl">💰</div>
              </div>
            </div>
          )}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Pendiente</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatMonto(totalPendiente)}
                </p>
              </div>
              <div className="text-4xl">⚠️</div>
            </div>
          </div>
        </div>

        {/* Filtros de estado */}
        <div className="mb-8 flex flex-wrap gap-3">
          {estados.map((estado) => (
            <button
              key={estado}
              onClick={() => setSelectedEstado(estado)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedEstado === estado
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {estado === 'todos' ? 'Todos' : estadoLabels[estado as keyof typeof estadoLabels]}
            </button>
          ))}
        </div>

        {/* Lista de pagos */}
        {filteredPagos.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-500 text-lg">No hay pagos en este estado</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredPagos.map((pago, index) => (
              <motion.div
                key={pago.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border-l-4"
                style={{
                  borderLeftColor:
                    pago.estado === 'pendiente'
                      ? '#eab308'
                      : pago.estado === 'pagado'
                      ? '#22c55e'
                      : pago.estado === 'vencido'
                      ? '#ef4444'
                      : '#f97316',
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          estadoColors[pago.estado]
                        }`}
                      >
                        {estadoLabels[pago.estado]}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                        {tipoLabels[pago.tipo]}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                      {pago.concepto}
                    </h2>
                  </div>
                  <div className="mt-2 sm:mt-0">
                    <div className="mb-2">
                      <p className="text-xs text-gray-500 mb-1">Monto Total</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                      {formatMonto(pago.monto)}
                    </p>
                    </div>
                    {/* Mostrar información de pago completo solo si está pagado */}
                    {(() => {
                      // Usar 'abono' que es el campo real en la BD, con fallback a monto_pagado para compatibilidad
                      const montoPagado = pago.abono !== undefined && pago.abono !== null 
                        ? pago.abono 
                        : (pago.monto_pagado || 0);
                      const montoTotal = pago.monto;
                      
                      // Verificar si el pago está completo
                      const estaCompleto = pago.estado === 'pagado' || (montoPagado >= montoTotal && montoTotal > 0);
                      
                      // Solo mostrar información si está completo
                      if (estaCompleto) {
                        return (
                          <div className="mt-3 space-y-2 bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold text-gray-700">Total Pagado:</span>
                              <span className="text-sm font-bold text-green-600">
                                {formatMonto(montoTotal)}
                              </span>
                            </div>
                            <div className="pt-2 border-t border-green-300">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-green-600 font-semibold">✓ Pago Completo</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      // No mostrar información de abono parcial - los pagos parciales y restantes se muestran como recuadros separados
                      return null;
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-semibold">📅 Fecha de Vencimiento:</span>
                      <span>{formatFecha(pago.fechaVencimiento)}</span>
                    </div>
                    {pago.fechaPago && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-semibold">✅ Fecha de Pago:</span>
                        <span className="text-green-600">{formatFecha(pago.fechaPago)}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {pago.referencia && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-semibold">🔖 Referencia:</span>
                        <span className="font-mono">{pago.referencia}</span>
                      </div>
                    )}
                    {pago.motivo_rechazo && (
                      <div className="flex items-start gap-2 text-sm mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <span className="font-semibold text-red-800">❌ Motivo de Rechazo:</span>
                        <span className="text-red-700">{pago.motivo_rechazo}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
                  {/* Lógica de botones según el tipo de pago */}
                  {(() => {
                    const concepto = pago.concepto || '';
                    const esPagoParcial = concepto.includes('Pago Parcial');
                    const esPagoRestante = concepto.includes('Restante');
                    // Si ya envió comprobante (referencia + archivo), el pago está en validación: no permitir enviar otro
                    const yaEnvioComprobante =
                      (pago.referencia && (pago.referencia?.trim() ?? '') !== '') &&
                      ((pago.comprobante_archivo_id != null && pago.comprobante_archivo_id !== undefined) ||
                        (pago.comprobante_url != null && pago.comprobante_url !== undefined));

                    // Si es un pago parcial (ya se envió el comprobante), solo mostrar "Esperando validación"
                    if (esPagoParcial && pago.estado === 'pendiente') {
                      return (
                        <>
                          <button 
                            onClick={() => {
                              setPagoSeleccionado(pago);
                              setShowDetallesModal(true);
                            }}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                          >
                            Ver Detalles
                          </button>
                          <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium text-center">
                            ⏳ Esperando validación
                          </div>
                        </>
                      );
                    }
                    
                    // Si es un pago restante, verificar si tiene todos los datos completos
                    if (esPagoRestante && pago.estado === 'pendiente') {
                      // Verificar si tiene todos los datos completos
                      const tieneReferencia = pago.referencia && pago.referencia.trim() !== '';
                      const tieneMetodoPago = pago.metodo_pago && pago.metodo_pago.trim() !== '';
                      const tieneDescripcion = (pago.descripcion || pago.observaciones) && (pago.descripcion?.trim() || pago.observaciones?.trim()) !== '';
                      // Verificar comprobante por archivo_id o URL
                      const tieneComprobante = (pago.comprobante_archivo_id !== null && pago.comprobante_archivo_id !== undefined) || 
                                             (pago.comprobante_url !== null && pago.comprobante_url !== undefined);
                      const tieneTodosLosDatos = tieneReferencia && tieneMetodoPago && tieneDescripcion && tieneComprobante;
                      
                      // Si NO tiene todos los datos, solo mostrar botón para enviar comprobante
                      if (!tieneTodosLosDatos) {
                        return (
                          <button 
                            onClick={() => handleAbrirModalPago(pago)}
                            disabled={loadingPago === pago.id}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loadingPago === pago.id ? 'Procesando...' : 'Enviar Comprobante'}
                          </button>
                        );
                      }
                      
                      // Si SÍ tiene todos los datos, mostrar "Ver Detalles" y "Esperando validación"
                      return (
                        <>
                          <button 
                            onClick={() => {
                              setPagoSeleccionado(pago);
                              setShowDetallesModal(true);
                            }}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                          >
                            Ver Detalles
                          </button>
                          <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium text-center">
                            ⏳ Esperando validación
                          </div>
                        </>
                      );
                    }
                    
                    // Para pagos pendientes normales (no parciales ni restantes) y no creados por admin
                    if (pago.estado === 'pendiente' && !pago.creado_por_admin && !esPagoParcial && !esPagoRestante) {
                      // Si ya envió comprobante, está en validación: no permitir enviar otro
                      if (yaEnvioComprobante) {
                        return (
                          <>
                            <button 
                              onClick={() => {
                                setPagoSeleccionado(pago);
                                setShowDetallesModal(true);
                              }}
                              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                            >
                              Ver Detalles
                            </button>
                            <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium text-center">
                              ⏳ Esperando validación
                            </div>
                          </>
                        );
                      }
                      return (
                        <>
                          <button 
                            onClick={() => {
                              setPagoSeleccionado(pago);
                              setFormEditPago({
                                concepto: pago.concepto,
                                monto: pago.monto.toString(),
                                tipo: pago.tipo,
                                fecha_vencimiento: pago.fechaVencimiento,
                              });
                              setShowEditModal(true);
                            }}
                            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium text-sm"
                          >
                            Editar Pago
                          </button>
                          <button 
                            onClick={() => handleAbrirModalPago(pago)}
                            disabled={loadingPago === pago.id}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loadingPago === pago.id ? 'Procesando...' : 'Enviar Comprobante'}
                          </button>
                        </>
                      );
                    }
                    
                    // Para pagos pendientes creados por admin (no parciales ni restantes)
                    if (pago.estado === 'pendiente' && pago.creado_por_admin && !esPagoParcial && !esPagoRestante) {
                      // Si ya envió comprobante, está en validación: no permitir enviar otro
                      if (yaEnvioComprobante) {
                        return (
                          <>
                            <button 
                              onClick={() => {
                                setPagoSeleccionado(pago);
                                setShowDetallesModal(true);
                              }}
                              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                            >
                              Ver Detalles
                            </button>
                            <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium text-center">
                              ⏳ Esperando validación
                            </div>
                          </>
                        );
                      }
                      return (
                        <button 
                          onClick={() => handleAbrirModalPago(pago)}
                          disabled={loadingPago === pago.id}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingPago === pago.id ? 'Procesando...' : 'Enviar Comprobante'}
                        </button>
                      );
                    }
                    
                    // Para pagos vencidos
                    if (pago.estado === 'vencido') {
                      // Si ya envió comprobante, está en validación: no permitir enviar otro
                      if (yaEnvioComprobante) {
                        return (
                          <>
                            <button 
                              onClick={() => {
                                setPagoSeleccionado(pago);
                                setShowDetallesModal(true);
                              }}
                              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                            >
                              Ver Detalles
                            </button>
                            <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium text-center">
                              ⏳ Esperando validación
                            </div>
                          </>
                        );
                      }
                      return (
                        <button 
                          onClick={() => handleAbrirModalPago(pago)}
                          disabled={loadingPago === pago.id}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingPago === pago.id ? 'Procesando...' : 'Realizar Pago'}
                        </button>
                      );
                    }
                    
                    // Para otros estados (pagado, rechazado, etc.), mostrar solo "Ver Detalles"
                    if (pago.estado === 'pagado' || pago.estado === 'parcial' || pago.estado === 'rechazado') {
                      return (
                        <button 
                          onClick={() => {
                            setPagoSeleccionado(pago);
                            setShowDetallesModal(true);
                          }}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                        >
                          Ver Detalles
                        </button>
                      );
                    }
                    
                    return null;
                  })()}
                  </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Información adicional */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            💡 Información sobre Pagos
          </h3>
          <ul className="text-blue-800 text-sm space-y-1 list-disc list-inside">
            <li>Los pagos pueden realizarse a través del portal, transferencia bancaria o en las oficinas administrativas.</li>
            <li>Las cuotas de mantenimiento vencen el día 10 de cada mes.</li>
            <li>Los pagos vencidos pueden generar intereses y multas según el reglamento del condominio.</li>
            <li>Para consultas sobre tu estado de cuenta, contacta a la administración.</li>
          </ul>
        </div>
      </div>

      {/* Modal para realizar pago */}
      <AnimatePresence>
        {showPagoModal && pagoSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Registrar Pago
              </h2>

              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formPago.nombre}
                    onChange={(e) => setFormPago({ ...formPago, nombre: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Tu nombre completo"
                    required
                  />
                </div>

                {/* Número de casa */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Casa/Apartamento *
                  </label>
                  <input
                    type="text"
                    value={formPago.numero_casa}
                    onChange={(e) => setFormPago({ ...formPago, numero_casa: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: A-101, 2B, etc."
                    required
                  />
                </div>

                {/* Concepto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Concepto *
                  </label>
                  <input
                    type="text"
                    value={formPago.concepto}
                    onChange={(e) => setFormPago({ ...formPago, concepto: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Cuota de Mantenimiento - Enero 2025"
                    required
                  />
                </div>

                {/* Opción: Usar mi abono disponible (solo para cuotas admin o Restante) */}
                {pagoSeleccionado && (pagoSeleccionado.creado_por_admin || (pagoSeleccionado.concepto || '').includes('Restante')) && abonoDisponible > 0 && (() => {
                  const restantePago = pagoSeleccionado.monto - (pagoSeleccionado.abono ?? pagoSeleccionado.monto_pagado ?? 0);
                  if (restantePago <= 0) return null;
                  const abonoAUsar = Math.min(abonoDisponible, restantePago);
                  const montoConComprobante = Math.max(0, restantePago - abonoAUsar);
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={usarAbonoEnPago}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setUsarAbonoEnPago(checked);
                            setFormPago(prev => ({
                              ...prev,
                              monto: checked ? montoConComprobante.toFixed(2) : restantePago.toFixed(2),
                            }));
                          }}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-blue-900">
                          Usar mi abono disponible ({formatMonto(abonoDisponible)}) como parte del pago
                        </span>
                      </label>
                      {usarAbonoEnPago && (
                        <p className="text-xs text-blue-800 mt-2">
                          Se aplicarán {formatMonto(abonoAUsar)} de tu abono. Monto a pagar con comprobante: {formatMonto(montoConComprobante)}.
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Monto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto a Pagar con comprobante *
                  </label>
                  {pagoSeleccionado && pagoSeleccionado.creado_por_admin ? (() => {
                    const montoPagado = pagoSeleccionado.abono !== undefined && pagoSeleccionado.abono !== null 
                      ? pagoSeleccionado.abono 
                      : (pagoSeleccionado.monto_pagado || 0);
                    const montoTotal = pagoSeleccionado.monto;
                    const montoRestante = montoTotal - montoPagado;
                    const montoMaximo = montoRestante;
                    const montoIngresado = parseFloat(formPago.monto || '0');
                    const excedente = montoIngresado > montoMaximo ? montoIngresado - montoMaximo : 0;
                    
                    return (
                      <>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formPago.monto}
                          onChange={(e) => setFormPago({ ...formPago, monto: e.target.value })}
                          className={`w-full bg-white text-gray-900 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            excedente > 0 ? 'border-orange-400' : 'border-gray-300'
                          }`}
                          placeholder={montoMaximo.toFixed(2)}
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Máximo permitido: {formatMonto(montoMaximo)} (restante de la cuota){usarAbonoEnPago ? '. Con abono aplicado, este es el monto que pagas con comprobante.' : ''}
                        </p>
                        {excedente > 0 && (
                          <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg p-2">
                            <p className="text-xs text-orange-800">
                              <strong>⚠️ Excedente detectado:</strong> El monto ingresado ({formatMonto(montoIngresado)}) excede el restante de la cuota ({formatMonto(montoMaximo)}).
                              <br />
                              <strong>El excedente de {formatMonto(excedente)} se guardará como abono</strong> y se aplicará automáticamente a tus próximas cuotas pendientes.
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })() : (
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formPago.monto}
                      onChange={(e) => setFormPago({ ...formPago, monto: e.target.value })}
                      className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                      required
                    />
                  )}
                </div>

                {/* Referencia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Referencia del Pago *
                  </label>
                  <input
                    type="text"
                    value={formPago.referencia}
                    onChange={(e) => setFormPago({ ...formPago, referencia: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: REF-2025-001234"
                    required
                  />
                </div>

                {/* Método de pago */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Método de Pago *
                  </label>
                  <select
                    value={formPago.metodo_pago}
                    onChange={(e) => setFormPago({ ...formPago, metodo_pago: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Selecciona un método</option>
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta de Débito/Crédito</option>
                    <option value="cheque">Cheque</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción / Argumento del Pago *
                  </label>
                  <textarea
                    value={formPago.descripcion}
                    onChange={(e) => setFormPago({ ...formPago, descripcion: e.target.value })}
                    rows={4}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Explica el motivo y detalles de tu pago..."
                    required
                  />
                </div>

                {/* Comprobante */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comprobante de Pago * (PDF, JPG, PNG)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Validar tamaño (max 10MB)
                        if (file.size > 10 * 1024 * 1024) {
                          alert('El archivo es demasiado grande. Máximo 10MB');
                          return;
                        }
                        setFormPago({ ...formPago, comprobante: file });
                      }
                    }}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  {formPago.comprobante && (
                    <p className="text-sm text-gray-600 mt-1">
                      Archivo seleccionado: {formPago.comprobante.name} ({(formPago.comprobante.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleRealizarPago}
                  disabled={
                    loadingPago === pagoSeleccionado.id || 
                    !formPago.nombre || 
                    !formPago.numero_casa || 
                    !formPago.concepto || 
                    !formPago.monto || 
                    (parseFloat(formPago.monto) < 0 || (parseFloat(formPago.monto) <= 0 && !usarAbonoEnPago)) ||
                    !formPago.referencia || 
                    !formPago.metodo_pago ||
                    !formPago.descripcion || 
                    !formPago.comprobante
                  }
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingPago === pagoSeleccionado.id ? 'Enviando...' : 'Registrar Pago'}
                </button>
                <button
                  onClick={() => {
                    setShowPagoModal(false);
                    setPagoSeleccionado(null);
                    setFormPago({ 
                      nombre: '', 
                      numero_casa: '', 
                      concepto: '', 
                      monto: '', 
                      referencia: '', 
                      descripcion: '', 
                      metodo_pago: '',
                      comprobante: null 
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal para editar pago */}
      <AnimatePresence>
        {showEditModal && pagoSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Editar Pago
              </h2>
              
              <div className="space-y-4">
                {/* Concepto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Concepto *
                  </label>
                  <input
                    type="text"
                    value={formEditPago.concepto}
                    onChange={(e) => setFormEditPago({ ...formEditPago, concepto: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Cuota de Mantenimiento - Enero 2025"
                    required
                  />
                </div>

                {/* Monto y Tipo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto (Opcional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formEditPago.monto}
                      onChange={(e) => setFormEditPago({ ...formEditPago, monto: e.target.value })}
                      className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo *
                    </label>
                    <select
                      value={formEditPago.tipo}
                      onChange={(e) => setFormEditPago({ ...formEditPago, tipo: e.target.value })}
                      className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="mantenimiento">Mantenimiento</option>
                      <option value="multa">Multa</option>
                      <option value="reserva">Reserva</option>
                      <option value="otros">Otros</option>
                    </select>
                  </div>
                </div>

                {/* Fecha de vencimiento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Vencimiento (Opcional)
                  </label>
                  <input
                    type="date"
                    value={formEditPago.fecha_vencimiento}
                    onChange={(e) => setFormEditPago({ ...formEditPago, fecha_vencimiento: e.target.value })}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Comprobante opcional */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nuevo Comprobante (Opcional)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          alert('El archivo es demasiado grande. Máximo 10MB');
                          return;
                        }
                        setFormPago({ ...formPago, comprobante: file });
                      }
                    }}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {formPago.comprobante && (
                    <p className="text-sm text-gray-600 mt-1">
                      Archivo seleccionado: {formPago.comprobante.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleEditarPago}
                  disabled={loadingPago === pagoSeleccionado.id || !formEditPago.concepto}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingPago === pagoSeleccionado.id ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setPagoSeleccionado(null);
                    setFormEditPago({ concepto: '', monto: '', tipo: 'mantenimiento', fecha_vencimiento: '' });
                    setFormPago({ ...formPago, comprobante: null });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal para enviar pago restante */}
      <AnimatePresence>
        {showPagoRestanteModal && pagoSeleccionado && (() => {
          // Usar 'abono' que es el campo real en la BD, con fallback a monto_pagado para compatibilidad
          const montoPagado = pagoSeleccionado.abono !== undefined && pagoSeleccionado.abono !== null 
            ? pagoSeleccionado.abono 
            : (pagoSeleccionado.monto_pagado || 0);
          const montoTotal = pagoSeleccionado.monto;
          const montoRestante = montoTotal - montoPagado;
          
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Enviar Pago Restante
                </h2>

                {/* Detalles del pago ya realizado */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">
                    Detalles del Pago Realizado
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Concepto:</span>
                      <span className="text-gray-900 font-semibold">{pagoSeleccionado.concepto}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Monto Total:</span>
                      <span className="text-gray-900 font-semibold">{formatMonto(montoTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Monto Pagado:</span>
                      <span className="text-green-600 font-semibold">{formatMonto(montoPagado)}</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-300 pt-2 mt-2">
                      <span className="text-gray-700 font-bold">Monto Restante:</span>
                      <span className="text-red-600 font-bold text-lg">{formatMonto(montoRestante)}</span>
                    </div>
                    {pagoSeleccionado.descripcion && (
                      <div className="mt-3 pt-3 border-t border-blue-300">
                        <span className="text-gray-600 font-medium block mb-1">Descripción:</span>
                        <span className="text-gray-900">{pagoSeleccionado.descripcion}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Formulario para enviar el pago restante */}
                <div className="space-y-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-orange-800">
                      <strong>Importante:</strong> Solo puedes enviar un monto máximo de {formatMonto(montoRestante)} (el restante del pago).
                    </p>
                  </div>

                  {/* Nombre */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={formPago.nombre}
                      onChange={(e) => setFormPago({ ...formPago, nombre: e.target.value })}
                      className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tu nombre completo"
                      required
                    />
                  </div>

                  {/* Número de casa */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número de Casa/Apartamento *
                    </label>
                    <input
                      type="text"
                      value={formPago.numero_casa}
                      onChange={(e) => setFormPago({ ...formPago, numero_casa: e.target.value })}
                      className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: A-101, 2B, etc."
                      required
                    />
                  </div>

                  {/* Monto Restante (prellenado y editable pero con validación) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto a Pagar (Restante) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={montoRestante}
                      value={formPago.monto}
                      onChange={(e) => {
                        const valor = parseFloat(e.target.value);
                        if (valor > montoRestante) {
                          alert(`El monto no puede ser mayor al restante (${formatMonto(montoRestante)})`);
                          setFormPago({ ...formPago, monto: montoRestante.toFixed(2) });
                        } else {
                          setFormPago({ ...formPago, monto: e.target.value });
                        }
                      }}
                      className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={montoRestante.toFixed(2)}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Máximo permitido: {formatMonto(montoRestante)}
                    </p>
                  </div>

                  {/* Referencia */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Referencia del Pago *
                    </label>
                    <input
                      type="text"
                      value={formPago.referencia}
                      onChange={(e) => setFormPago({ ...formPago, referencia: e.target.value })}
                      className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: REF-2025-001234"
                      required
                    />
                  </div>

                  {/* Método de pago */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Método de Pago *
                    </label>
                    <select
                      value={formPago.metodo_pago}
                      onChange={(e) => setFormPago({ ...formPago, metodo_pago: e.target.value })}
                      className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Selecciona un método</option>
                      <option value="transferencia">Transferencia Bancaria</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="tarjeta">Tarjeta de Débito/Crédito</option>
                      <option value="cheque">Cheque</option>
                      <option value="otros">Otros</option>
                    </select>
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción / Argumento del Pago *
                    </label>
                    <textarea
                      value={formPago.descripcion}
                      onChange={(e) => setFormPago({ ...formPago, descripcion: e.target.value })}
                      rows={4}
                      className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Explica el motivo y detalles de este pago restante..."
                      required
                    />
                  </div>

                  {/* Comprobante */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comprobante de Pago * (PDF, JPG, PNG)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            alert('El archivo es demasiado grande. Máximo 10MB');
                            return;
                          }
                          setFormPago({ ...formPago, comprobante: file });
                        }
                      }}
                      className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    {formPago.comprobante && (
                      <p className="text-sm text-gray-600 mt-1">
                        Archivo seleccionado: {formPago.comprobante.name} ({(formPago.comprobante.size / 1024).toFixed(2)} KB)
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={async () => {
                      // Validar que el monto no exceda el restante
                      const montoAEnviar = parseFloat(formPago.monto);
                      if (montoAEnviar > montoRestante) {
                        alert(`El monto no puede ser mayor al restante. Restante: ${formatMonto(montoRestante)}`);
                        return;
                      }
                      
                      if (montoAEnviar <= 0) {
                        alert('El monto debe ser mayor a 0');
                        return;
                      }
                      
                      try {
                        // Usar la misma función handleRealizarPago pero con validación adicional
                        await handleRealizarPago();
                        // Cerrar el modal después de que se complete exitosamente
                        setShowPagoRestanteModal(false);
                        // Limpiar el formulario
                        setFormPago({
                          nombre: '',
                          numero_casa: '',
                          concepto: '',
                          monto: '',
                          referencia: '',
                          descripcion: '',
                          metodo_pago: '',
                          comprobante: null
                        });
                        setPagoSeleccionado(null);
                      } catch (error) {
                        console.error('Error al enviar pago restante:', error);
                        // No cerrar el modal si hay error para que el usuario pueda corregir
                      }
                    }}
                    disabled={
                      loadingPago === pagoSeleccionado.id || 
                      !formPago.nombre || 
                      !formPago.numero_casa || 
                      !formPago.monto || 
                      parseFloat(formPago.monto) <= 0 ||
                      parseFloat(formPago.monto) > montoRestante ||
                      !formPago.referencia || 
                      !formPago.metodo_pago ||
                      !formPago.descripcion || 
                      !formPago.comprobante
                    }
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingPago === pagoSeleccionado.id ? 'Enviando...' : 'Enviar Pago Restante'}
                  </button>
                  <button
                    onClick={() => {
                      setShowPagoRestanteModal(false);
                      setPagoSeleccionado(null);
                      setFormPago({ 
                        nombre: '', 
                        numero_casa: '', 
                        concepto: '', 
                        monto: '', 
                        referencia: '', 
                        descripcion: '', 
                        metodo_pago: '',
                        comprobante: null 
                      });
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Modal para ver detalles del pago */}
      <AnimatePresence>
        {showDetallesModal && pagoSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Detalles del Pago
              </h2>

              <div className="space-y-4">
                {/* Concepto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Concepto
                  </label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg font-semibold">
                    {pagoSeleccionado.concepto}
                  </p>
                </div>

                {/* Monto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto
                  </label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg font-semibold text-lg">
                    {formatMonto(pagoSeleccionado.monto)}
                  </p>
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {estadoLabels[pagoSeleccionado.estado] || pagoSeleccionado.estado}
                  </p>
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {tipoLabels[pagoSeleccionado.tipo] || pagoSeleccionado.tipo}
                  </p>
                </div>

                {/* Fecha de Vencimiento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Vencimiento
                  </label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {formatFecha(pagoSeleccionado.fechaVencimiento)}
                  </p>
                </div>

                {/* Fecha de Pago */}
                {pagoSeleccionado.fechaPago && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Pago
                    </label>
                    <p className="text-green-600 bg-green-50 p-3 rounded-lg font-semibold">
                      {formatFecha(pagoSeleccionado.fechaPago)}
                    </p>
                  </div>
                )}

                {/* Referencia */}
                {pagoSeleccionado.referencia && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Referencia del Pago
                    </label>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg font-mono">
                      {pagoSeleccionado.referencia}
                    </p>
                  </div>
                )}

                {/* Método de Pago */}
                {pagoSeleccionado.metodo_pago && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Método de Pago
                    </label>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                      {pagoSeleccionado.metodo_pago}
                    </p>
                  </div>
                )}

                {/* Descripción / Observaciones */}
                {(pagoSeleccionado.descripcion || pagoSeleccionado.observaciones) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción / Observaciones
                    </label>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                      {pagoSeleccionado.descripcion || pagoSeleccionado.observaciones}
                    </p>
                  </div>
                )}

                {/* Comprobante */}
                {pagoSeleccionado.comprobante_url && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comprobante de Pago
                    </label>
                    <a
                      href={pagoSeleccionado.comprobante_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline bg-blue-50 p-3 rounded-lg inline-block"
                    >
                      Ver Comprobante
                    </a>
                  </div>
                )}

                {/* Motivo de Rechazo */}
                {pagoSeleccionado.motivo_rechazo && (
                  <div>
                    <label className="block text-sm font-medium text-red-700 mb-1">
                      Motivo de Rechazo
                    </label>
                    <p className="text-red-800 bg-red-50 p-3 rounded-lg border border-red-200">
                      {pagoSeleccionado.motivo_rechazo}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <button
                  onClick={() => {
                    setShowDetallesModal(false);
                    setPagoSeleccionado(null);
                  }}
                  className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

