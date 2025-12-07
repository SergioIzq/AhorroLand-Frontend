export class GastoProgramado {
    id!: string;
    importe!: number;
    frecuencia!: 'DIARIO' | 'SEMANAL' | 'MENSUAL' | 'ANUAL';
    descripcion?: string;
    fechaEjecucion!: Date;
    activo!: boolean;
    conceptoId!: string;
    proveedorId?: string;
    personaId?: string;
    cuentaId!: string;
    usuarioId!: string;
    formaPagoId?: string;
    hangfireJobId?: string;
}
