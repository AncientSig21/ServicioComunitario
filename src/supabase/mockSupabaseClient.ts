/**
 * MOCK SUPABASE CLIENT - Para modo demo/offline
 * Simula todas las operaciones de Supabase usando localStorage
 */

import mockDatabaseInitial from '../data/mockDatabase.json';

const MOCK_DB_KEY = 'mockDatabase_condominio';
const DEMO_MODE_KEY = 'DEMO_MODE_ACTIVE';

// ==================== GESTIÓN DE BASE DE DATOS LOCAL ====================

export const getMockDatabase = (): any => {
  try {
    const stored = localStorage.getItem(MOCK_DB_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Error cargando mock database:', error);
  }
  // Inicializar con datos por defecto
  saveMockDatabase(mockDatabaseInitial);
  return mockDatabaseInitial;
};

export const saveMockDatabase = (db: any) => {
  try {
    localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));
  } catch (error) {
    console.error('Error guardando mock database:', error);
  }
};

export const resetMockDatabase = () => {
  saveMockDatabase(mockDatabaseInitial);
  console.log('🔄 Base de datos demo reiniciada');
};

// ==================== MOCK QUERY BUILDER ====================

class MockQueryBuilder {
  private tableName: string;
  private filters: Array<{ field: string; operator: string; value: any }> = [];
  private selectedFields: string = '*';
  private orderByField: string | null = null;
  private orderAscending: boolean = true;
  private limitCount: number | null = null;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;
  private isCount: boolean = false;
  private isHead: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields: string = '*', options?: { count?: 'exact'; head?: boolean }) {
    this.selectedFields = fields;
    if (options?.count) {
      this.isCount = true;
    }
    if (options?.head) {
      this.isHead = true;
    }
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ field, operator: 'eq', value });
    return this;
  }

  neq(field: string, value: any) {
    this.filters.push({ field, operator: 'neq', value });
    return this;
  }

  gt(field: string, value: any) {
    this.filters.push({ field, operator: 'gt', value });
    return this;
  }

  gte(field: string, value: any) {
    this.filters.push({ field, operator: 'gte', value });
    return this;
  }

  lt(field: string, value: any) {
    this.filters.push({ field, operator: 'lt', value });
    return this;
  }

  lte(field: string, value: any) {
    this.filters.push({ field, operator: 'lte', value });
    return this;
  }

  like(field: string, value: any) {
    this.filters.push({ field, operator: 'like', value });
    return this;
  }

  ilike(field: string, value: any) {
    this.filters.push({ field, operator: 'ilike', value });
    return this;
  }

  in(field: string, values: any[]) {
    this.filters.push({ field, operator: 'in', value: values });
    return this;
  }

  is(field: string, value: any) {
    this.filters.push({ field, operator: 'is', value });
    return this;
  }

  or(_conditions: string) {
    // Simplificación: ignorar OR complejos en modo demo
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderByField = field;
    this.orderAscending = options?.ascending !== false;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  private applyFilter(item: any, filter: { field: string; operator: string; value: any }): boolean {
    const { field, operator, value } = filter;
    const itemValue = item[field];

    switch (operator) {
      case 'eq':
        return itemValue === value;
      case 'neq':
        return itemValue !== value;
      case 'gt':
        return itemValue > value;
      case 'gte':
        return itemValue >= value;
      case 'lt':
        return itemValue < value;
      case 'lte':
        return itemValue <= value;
      case 'like':
        return String(itemValue).includes(value.replace(/%/g, ''));
      case 'ilike':
        return String(itemValue).toLowerCase().includes(value.replace(/%/g, '').toLowerCase());
      case 'in':
        return Array.isArray(value) && value.includes(itemValue);
      case 'is':
        if (value === null) return itemValue === null || itemValue === undefined;
        return itemValue === value;
      default:
        return true;
    }
  }

  private resolveRelations(item: any, db: any): any {
    const result = { ...item };
    
    // Resolver relaciones comunes basadas en el nombre de la tabla
    if (this.tableName === 'pagos') {
      if (item.usuario_id && db.usuarios) {
        result.usuarios = db.usuarios.find((u: any) => u.id === item.usuario_id) || null;
      }
      if (item.vivienda_id && db.viviendas) {
        result.viviendas = db.viviendas.find((v: any) => v.id === item.vivienda_id) || null;
      }
      if (item.comprobante_archivo_id && db.archivos) {
        result.archivo = db.archivos.find((a: any) => a.id === item.comprobante_archivo_id) || null;
      }
    }
    
    if (this.tableName === 'anuncios') {
      if (item.autor_usuario_id && db.usuarios) {
        result.autor_usuario = db.usuarios.find((u: any) => u.id === item.autor_usuario_id) || null;
      }
      if (item.archivo_imagen_id && db.archivos) {
        result.archivo_imagen = db.archivos.find((a: any) => a.id === item.archivo_imagen_id) || null;
      }
    }

    if (this.tableName === 'solicitudes_mantenimiento') {
      if (item.usuario_solicitante_id && db.usuarios) {
        result.usuario = db.usuarios.find((u: any) => u.id === item.usuario_solicitante_id) || null;
      }
      if (item.vivienda_id && db.viviendas) {
        result.vivienda = db.viviendas.find((v: any) => v.id === item.vivienda_id) || null;
      }
    }

    if (this.tableName === 'reservas_espacios') {
      if (item.espacio_id && db.espacios) {
        result.espacio = db.espacios.find((e: any) => e.id === item.espacio_id) || null;
      }
      if (item.usuario_id && db.usuarios) {
        result.usuario = db.usuarios.find((u: any) => u.id === item.usuario_id) || null;
      }
    }

    return result;
  }

  async then(resolve: (result: any) => void) {
    const result = await this.execute();
    resolve(result);
    return result;
  }

  async execute(): Promise<{ data: any; error: any; count?: number }> {
    try {
      const db = getMockDatabase();
      let data = db[this.tableName] || [];

      // Aplicar filtros
      for (const filter of this.filters) {
        data = data.filter((item: any) => this.applyFilter(item, filter));
      }

      // Resolver relaciones si se solicitan campos con *
      if (this.selectedFields.includes('*') || this.selectedFields.includes(',')) {
        data = data.map((item: any) => this.resolveRelations(item, db));
      }

      // Ordenar
      if (this.orderByField) {
        data = [...data].sort((a: any, b: any) => {
          const aVal = a[this.orderByField!];
          const bVal = b[this.orderByField!];
          if (aVal < bVal) return this.orderAscending ? -1 : 1;
          if (aVal > bVal) return this.orderAscending ? 1 : -1;
          return 0;
        });
      }

      // Count mode
      if (this.isCount && this.isHead) {
        return { data: null, error: null, count: data.length };
      }

      // Limitar
      if (this.limitCount !== null) {
        data = data.slice(0, this.limitCount);
      }

      // Single/MaybeSingle
      if (this.isSingle) {
        if (data.length === 0) {
          return { data: null, error: { message: 'No se encontró el registro', code: 'PGRST116' } };
        }
        return { data: data[0], error: null };
      }

      if (this.isMaybeSingle) {
        return { data: data.length > 0 ? data[0] : null, error: null };
      }

      return { data, error: null, count: data.length };
    } catch (error: any) {
      console.error('Mock query error:', error);
      return { data: null, error: { message: error.message } };
    }
  }
}

// ==================== MOCK INSERT BUILDER ====================

class MockInsertBuilder {
  private tableName: string;
  private insertData: any[];

  constructor(tableName: string, data: any | any[]) {
    this.tableName = tableName;
    this.insertData = Array.isArray(data) ? data : [data];
  }

  select(_fields: string = '*') {
    return this;
  }

  single() {
    return this;
  }

  maybeSingle() {
    return this;
  }

  async then(resolve: (result: any) => void) {
    const result = await this.execute();
    resolve(result);
    return result;
  }

  async execute(): Promise<{ data: any; error: any }> {
    try {
      const db = getMockDatabase();
      if (!db[this.tableName]) {
        db[this.tableName] = [];
      }

      const insertedItems: any[] = [];
      for (const item of this.insertData) {
        const maxId = db[this.tableName].reduce((max: number, i: any) => Math.max(max, i.id || 0), 0);
        const newItem = {
          ...item,
          id: item.id || maxId + 1,
          created_at: item.created_at || new Date().toISOString()
        };
        db[this.tableName].push(newItem);
        insertedItems.push(newItem);
      }

      saveMockDatabase(db);

      return {
        data: insertedItems.length === 1 ? insertedItems[0] : insertedItems,
        error: null
      };
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  }
}

// ==================== MOCK UPDATE BUILDER ====================

class MockUpdateBuilder {
  private tableName: string;
  private updateData: any;
  private filters: Array<{ field: string; value: any }> = [];

  constructor(tableName: string, data: any) {
    this.tableName = tableName;
    this.updateData = data;
  }

  eq(field: string, value: any) {
    this.filters.push({ field, value });
    return this;
  }

  select(_fields: string = '*') {
    return this;
  }

  single() {
    return this;
  }

  maybeSingle() {
    return this;
  }

  async then(resolve: (result: any) => void) {
    const result = await this.execute();
    resolve(result);
    return result;
  }

  async execute(): Promise<{ data: any; error: any }> {
    try {
      const db = getMockDatabase();
      if (!db[this.tableName]) {
        return { data: null, error: { message: 'Tabla no encontrada' } };
      }

      const updatedItems: any[] = [];
      db[this.tableName] = db[this.tableName].map((item: any) => {
        let matches = true;
        for (const filter of this.filters) {
          if (item[filter.field] !== filter.value) {
            matches = false;
            break;
          }
        }
        if (matches) {
          const updated = { ...item, ...this.updateData, updated_at: new Date().toISOString() };
          updatedItems.push(updated);
          return updated;
        }
        return item;
      });

      saveMockDatabase(db);

      return {
        data: updatedItems.length === 1 ? updatedItems[0] : updatedItems,
        error: null
      };
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  }
}

// ==================== MOCK DELETE BUILDER ====================

class MockDeleteBuilder {
  private tableName: string;
  private filters: Array<{ field: string; value: any }> = [];

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  eq(field: string, value: any) {
    this.filters.push({ field, value });
    return this;
  }

  async then(resolve: (result: any) => void) {
    const result = await this.execute();
    resolve(result);
    return result;
  }

  async execute(): Promise<{ data: any; error: any }> {
    try {
      const db = getMockDatabase();
      if (!db[this.tableName]) {
        return { data: null, error: null };
      }

      const deletedItems: any[] = [];
      db[this.tableName] = db[this.tableName].filter((item: any) => {
        let matches = true;
        for (const filter of this.filters) {
          if (item[filter.field] !== filter.value) {
            matches = false;
            break;
          }
        }
        if (matches) {
          deletedItems.push(item);
          return false;
        }
        return true;
      });

      saveMockDatabase(db);

      return { data: deletedItems, error: null };
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  }
}

// ==================== MOCK RPC ====================

const mockRpcFunctions: Record<string, (params: any) => any> = {
  actualizar_total_pagado_usuario: async (params: any) => {
    const db = getMockDatabase();
    const { p_usuario_id } = params;
    
    // Calcular total de pagos validados
    const pagosValidados = db.pagos?.filter(
      (p: any) => p.usuario_id === p_usuario_id && p.estado === 'validado'
    ) || [];
    
    const totalPagado = pagosValidados.reduce((sum: number, p: any) => sum + (p.monto || 0), 0);
    
    // Actualizar usuario
    const usuario = db.usuarios?.find((u: any) => u.id === p_usuario_id);
    if (usuario) {
      usuario.total_pagado = totalPagado;
      saveMockDatabase(db);
    }
    
    return { data: { total_pagado: totalPagado }, error: null };
  },

  reset_password_con_codigo: async (params: any) => {
    const db = getMockDatabase();
    const { p_correo, p_codigo, p_nueva_contraseña } = params;
    
    const usuario = db.usuarios?.find(
      (u: any) => u.correo?.toLowerCase() === p_correo?.toLowerCase()
    );
    
    if (!usuario) {
      return { data: { success: false, error: 'Usuario no encontrado' }, error: null };
    }
    
    if (usuario.codigo_recuperacion !== p_codigo) {
      return { data: { success: false, error: 'Código incorrecto' }, error: null };
    }
    
    usuario.contraseña = p_nueva_contraseña;
    saveMockDatabase(db);
    
    return { data: { success: true, nombre: usuario.nombre }, error: null };
  }
};

// ==================== MOCK SUPABASE CLIENT ====================

export const createMockSupabaseClient = () => {
  console.log('🎮 MODO DEMO ACTIVO - Usando datos locales');

  return {
    from: (tableName: string) => ({
      select: (fields?: string, options?: any) => {
        const builder = new MockQueryBuilder(tableName);
        return builder.select(fields || '*', options);
      },
      insert: (data: any | any[]) => new MockInsertBuilder(tableName, data),
      update: (data: any) => new MockUpdateBuilder(tableName, data),
      delete: () => new MockDeleteBuilder(tableName),
      upsert: (data: any) => new MockInsertBuilder(tableName, data),
    }),

    rpc: async (functionName: string, params?: any) => {
      const fn = mockRpcFunctions[functionName];
      if (fn) {
        return await fn(params);
      }
      console.warn(`Mock RPC function not implemented: ${functionName}`);
      return { data: null, error: null };
    },

    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: null, error: { message: 'Use login form' } }),
      signUp: async () => ({ data: null, error: { message: 'Use register form' } }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },

    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: { message: 'Storage disabled in demo mode' } }),
        download: async () => ({ data: null, error: { message: 'Storage disabled in demo mode' } }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },

    channel: () => ({
      on: () => ({ subscribe: () => {} }),
    }),
  };
};

// ==================== HELPERS PARA MODO DEMO ====================

export const isDemoMode = (): boolean => {
  // Verificar si hay conexión a internet
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }
  // Verificar flag manual
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(DEMO_MODE_KEY) === 'true';
  }
  return false;
};

export const enableDemoMode = () => {
  localStorage.setItem(DEMO_MODE_KEY, 'true');
  console.log('✅ Modo Demo activado');
  window.location.reload();
};

export const disableDemoMode = () => {
  localStorage.removeItem(DEMO_MODE_KEY);
  console.log('❌ Modo Demo desactivado');
  window.location.reload();
};

export const toggleDemoMode = () => {
  if (isDemoMode()) {
    disableDemoMode();
  } else {
    enableDemoMode();
  }
};

// Exponer funciones globalmente para debug/demo
if (typeof window !== 'undefined') {
  (window as any).demoMode = {
    enable: enableDemoMode,
    disable: disableDemoMode,
    toggle: toggleDemoMode,
    isActive: isDemoMode,
    resetData: resetMockDatabase,
    getData: getMockDatabase,
  };
}
