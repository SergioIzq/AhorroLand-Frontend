export class IngresoProgramado {
    id!: string;
    importe!: number;
    frecuencia!: 'DIARIO' | 'SEMANAL' | 'MENSUAL' | 'ANUAL';
    descripcion?: string;
    fechaEjecucion!: Date;
    activo!: boolean;
    conceptoId!: string;
    clienteId?: string;
    personaId?: string;
    cuentaId!: string;
    usuarioId!: string;
    formaPagoId?: string;
    hangfireJobId?: string;
}
