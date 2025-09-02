export class Usuario {
    id: number;
    username: string;
    fullName: string;
    estado: string;
    role: string;
    enabled: boolean; // Aseguramos que estos campos coincidan con lo que el backend devuelve
    accountNonLocked: boolean;
    accountNonExpired: boolean;
    credentialsNonExpired: boolean;

    constructor(id: number, fullName: string, username: string, estado: string, role: string, enabled: boolean, accountNonLocked: boolean, accountNonExpired: boolean, credentialsNonExpired: boolean) {
        this.id = id;
        this.fullName = fullName;
        this.username = username;
        this.estado = estado;
        this.role = role;
        this.enabled = enabled;
        this.accountNonLocked = accountNonLocked;
        this.accountNonExpired = accountNonExpired;
        this.credentialsNonExpired = credentialsNonExpired;
    }
}

export class UserSession {
    token: string;
    timeExpires: string;
    usuario: Usuario;

    constructor(token: string, timeExpires: string, usuario: Usuario) {
        this.token = token;
        this.timeExpires = timeExpires;
        this.usuario = usuario;
    }
}
