export class UsuariosSaveRequest {
    id: number;
    username: string;
    password: string;
    fullName: string;
    dni: string;
    celular: string;
    email: string;
    estado: string;
    role: string;
}

export class UsuariosDeleteRequest {
    id: number
}