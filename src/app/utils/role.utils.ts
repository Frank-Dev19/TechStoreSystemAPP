export const RECEPTIONIST_ROLE_NAMES = ['recepcionista', 'receptionist'] as const
export const TECHNICIAN_ROLE_NAMES = ['technician', 'tecnico'] as const
export const SUPERVISOR_ROLE_NAMES = ['supervisor'] as const

type NamedRole = { name?: string | null }

const normalizeRoleName = (name?: string | null): string => (name ? name.trim().toLowerCase() : '')

export const roleNameMatches = (name: string | null | undefined, allowed: readonly string[]): boolean => {
  const normalized = normalizeRoleName(name)
  return !!normalized && allowed.includes(normalized)
}

export const hasAnyRole = (roles: NamedRole[] | undefined | null, allowed: readonly string[]): boolean => {
  if (!roles?.length) {
    return false
  }
  return roles.some((role) => roleNameMatches(role?.name, allowed))
}
