export interface Categoria {
    id: string;
    nombre: string;
    descripcion: string | null;
    fechaCreacion: Date | null;
    usuarioId: string;
}