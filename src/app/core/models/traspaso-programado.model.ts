export class TraspasoProgramado {
    id!: string;
    importe!: number;
    usuarioId!: string;
    cuentaOrigenId!: string
    cuentaDestinoId!: string;
    frecuencia!: 'DIARIO' | 'SEMANAL' | 'MENSUAL' | 'ANUAL';
    descripcion?: string;
    activo!: boolean;
}