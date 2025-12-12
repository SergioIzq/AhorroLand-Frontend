// Para el Dashboard
export interface ResumenFinanciero {
    totalGastos: number;
    cantidadGastos: number;
    totalIngresos: number;
    cantidadIngresos: number;
    balance: number; // Puede venir 0, no lo hagas opcional a menos que sea null
    periodoInicio?: string; // DateTime viene como string en JSON
    periodoFin?: string;
    // En C# Dictionary<string, decimal> se mapea a Record<string, number>
    gastoPorCategoria: Record<string, number>;
    ingresoPorTipo: Record<string, number>;
}

// Para la respuesta del Login (según tu ejemplo JSON)
export interface LoginResponse {
    token: string;
    expiresAt: string;
}

// Lo que va dentro de Result<PaginatedResponse<T>>
export interface PaginatedList<T> {
    items: T[];
    page: number;
    pageSize: number;
    totalCount: number; // En C# suele ser TotalCount, si usas 'total' cámbialo aquí
    hasNextPage: boolean; // Opcional, si tu backend lo devuelve
    hasPreviousPage: boolean; // Opcional
}

// Define la estructura del error que viene en el JSON
export interface ApiError {
    code: string;
    name: string;
    message: string;
    type: string; // "Failure", "Validation", "NotFound", etc.
}

// ✅ ESTA ES LA NUEVA ENVOLTURA PRINCIPAL
// Reemplaza a tu antigua 'ApiResponse'
export interface Result<T> {
    value: T; // Antes era 'data'
    isSuccess: boolean; // Antes era 'success'
    isFailure: boolean;
    error: ApiError; // Ahora es un objeto estructurado, no un string
}
