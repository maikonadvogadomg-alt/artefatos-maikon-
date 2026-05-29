const KEYS = {
  clientes: "sk_db_clientes",
  processos: "sk_db_processos",
  audiencias: "sk_db_audiencias",
  documentos: "sk_db_documentos",
};

function load<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as T[];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

function nextId<T extends { id: number }>(items: T[]): number {
  return items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
}

export interface Cliente {
  id: number;
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  observacoes?: string;
  createdAt: string;
}

export interface Processo {
  id: number;
  numero: string;
  tipo: string;
  clienteId?: number | null;
  tribunal?: string;
  vara?: string;
  status: string;
  descricao?: string;
  valorCausa?: number;
  createdAt: string;
}

export interface Audiencia {
  id: number;
  processoId: number;
  data: string;
  hora: string;
  local?: string;
  tipo: string;
  status: string;
  notas?: string;
  createdAt: string;
}

export interface Documento {
  id: number;
  titulo: string;
  tipo?: string;
  conteudo: string;
  processoId?: number | null;
  clienteId?: number | null;
  createdAt: string;
}

export const db = {
  clientes: {
    list: (): Cliente[] => load<Cliente>(KEYS.clientes),
    create: (data: Omit<Cliente, "id" | "createdAt">): Cliente => {
      const items = load<Cliente>(KEYS.clientes);
      const item: Cliente = { ...data, id: nextId(items), createdAt: new Date().toISOString() };
      save(KEYS.clientes, [...items, item]);
      return item;
    },
    update: (id: number, data: Partial<Cliente>): Cliente | null => {
      const items = load<Cliente>(KEYS.clientes);
      const idx = items.findIndex((i) => i.id === id);
      if (idx === -1) return null;
      items[idx] = { ...items[idx], ...data };
      save(KEYS.clientes, items);
      return items[idx];
    },
    delete: (id: number): boolean => {
      const items = load<Cliente>(KEYS.clientes);
      const filtered = items.filter((i) => i.id !== id);
      save(KEYS.clientes, filtered);
      return filtered.length < items.length;
    },
  },
  processos: {
    list: (): Processo[] => load<Processo>(KEYS.processos),
    create: (data: Omit<Processo, "id" | "createdAt">): Processo => {
      const items = load<Processo>(KEYS.processos);
      const item: Processo = { ...data, id: nextId(items), createdAt: new Date().toISOString() };
      save(KEYS.processos, [...items, item]);
      return item;
    },
    update: (id: number, data: Partial<Processo>): Processo | null => {
      const items = load<Processo>(KEYS.processos);
      const idx = items.findIndex((i) => i.id === id);
      if (idx === -1) return null;
      items[idx] = { ...items[idx], ...data };
      save(KEYS.processos, items);
      return items[idx];
    },
    delete: (id: number): boolean => {
      const items = load<Processo>(KEYS.processos);
      const filtered = items.filter((i) => i.id !== id);
      save(KEYS.processos, filtered);
      return filtered.length < items.length;
    },
  },
  audiencias: {
    list: (): Audiencia[] => load<Audiencia>(KEYS.audiencias),
    create: (data: Omit<Audiencia, "id" | "createdAt">): Audiencia => {
      const items = load<Audiencia>(KEYS.audiencias);
      const item: Audiencia = { ...data, id: nextId(items), createdAt: new Date().toISOString() };
      save(KEYS.audiencias, [...items, item]);
      return item;
    },
  },
  documentos: {
    list: (): Documento[] => load<Documento>(KEYS.documentos),
    create: (data: Omit<Documento, "id" | "createdAt">): Documento => {
      const items = load<Documento>(KEYS.documentos);
      const item: Documento = { ...data, id: nextId(items), createdAt: new Date().toISOString() };
      save(KEYS.documentos, [...items, item]);
      return item;
    },
    delete: (id: number): boolean => {
      const items = load<Documento>(KEYS.documentos);
      const filtered = items.filter((i) => i.id !== id);
      save(KEYS.documentos, filtered);
      return filtered.length < items.length;
    },
  },
};
