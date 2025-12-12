export interface Usuario {
    id: string;
    correo: string;
    nombre: string;
    apellidos?: string | null;
    rol?: string;
    avatar?: string | null;
}

export interface LoginCredentials {
    correo: string;
    contrasena: string;
}

export interface AuthResponse {
    token: string;
    expiresAt: string;
}
