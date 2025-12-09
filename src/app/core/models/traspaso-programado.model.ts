export type Frecuencia = 'DIARIO' | 'SEMANAL' | 'MENSUAL' | 'ANUAL';

export interface TraspasoProgramado {
    id: string;
    cuentaOrigenId: string;
    cuentaOrigenNombre: string;
    cuentaDestinoId: string;
    cuentaDestinoNombre: string;
    importe: number;
    frecuencia: Frecuencia;
    fechaEjecucion: string;
    activo: boolean;
    descripcion?: string;
    usuarioId: string;
    hangfireJobId?: string;
    saldoCuentaOrigen?: number;
    saldoCuentaDestino?: number;
}

export interface TraspasoProgramadoCreate {
    cuentaOrigenId: string;
    cuentaDestinoId: string;
    importe: number;
    frecuencia: Frecuencia;
    fechaEjecucion: string;
    activo: boolean;
    descripcion?: string;
}