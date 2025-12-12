export type Frecuencia = 'DIARIO' | 'SEMANAL' | 'MENSUAL' | 'ANUAL';

export interface GastoProgramado {
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
    proveedorId: string;
    proveedorNombre: string;
    personaId: string;
    personaNombre: string;
    cuentaId: string;
    cuentaNombre: string;
    formaPagoId: string;
    formaPagoNombre: string;
    usuarioId: string;
    hangfireJobId?: string;
}

export interface GastoProgramadoCreate {
    importe: number;
    frecuencia: Frecuencia;
    fechaEjecucion: string;
    activo: boolean;
    descripcion?: string;
    conceptoId: string;
    categoriaId: string;
    proveedorId: string;
    personaId: string;
    cuentaId: string;
    formaPagoId: string;
}
