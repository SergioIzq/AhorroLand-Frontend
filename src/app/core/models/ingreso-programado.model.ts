export type Frecuencia = 'DIARIO' | 'SEMANAL' | 'MENSUAL' | 'ANUAL';

export interface IngresoProgramado {
    id: string;
    importe: number;
    frecuencia: Frecuencia;
    fechaEjecucion: string;
    activo: boolean;
    descripcion?: string;
    conceptoId: string;
    conceptoNombre: string;
    categoriaId: string;
    categoriaNombre: string;
    clienteId: string;
    clienteNombre: string;
    personaId: string;
    personaNombre: string;
    cuentaId: string;
    cuentaNombre: string;
    formaPagoId: string;
    formaPagoNombre: string;
    usuarioId: string;
    hangfireJobId?: string;
}

export interface IngresoProgramadoCreate {
    importe: number;
    frecuencia: Frecuencia;
    fechaEjecucion: string;
    activo: boolean;
    descripcion?: string;
    conceptoId: string;
    categoriaId: string;
    clienteId: string;
    personaId: string;
    cuentaId: string;
    formaPagoId: string;
}
