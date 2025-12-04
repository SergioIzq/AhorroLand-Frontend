export interface Usuario {
    id: string;
    email: string;
    nombre: string;
    apellido?: string;
    rol?: string;
    avatar?: string;
}

export interface LoginCredentials {
    correo: string;
    contrasena: string;
}

export interface AuthResponse {
    token: string;
    expiresAt: string;
}
