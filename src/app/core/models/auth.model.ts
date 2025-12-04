export interface Usuario {
    id: string;
    email: string;
    nombre: string;
    apellidos?: string | null;
    rol?: string;
}

export interface LoginCredentials {
    correo: string;
    contrasena: string;
}

export interface AuthResponse {
    token: string;
    expiresAt: string;
}
