export interface Traspaso {
    id: string;
    cuentaOrigenId: string;
    cuentaOrigenNombre: string;
    cuentaDestinoId: string;
    cuentaDestinoNombre: string;
    importe: number;
    fecha: string;
    descripcion?: string;
    usuarioId: string;
}

export interface TraspasoCreate {
    cuentaOrigenId: string;
    cuentaDestinoId: string;
    importe: number;
    fecha: string;
    descripcion?: string;
}
