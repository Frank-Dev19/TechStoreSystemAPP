import { ClientResponse } from '../clients-response';

export type ServiceOrderSlaStage =
  | 'assignment'
  | 'diagnosis'
  | 'service'
  | 'pickup'
  | 'terminal';

export interface ServiceOrderSla {
  stage: ServiceOrderSlaStage;
  targetMinutes: number | null;
  elapsedMinutes: number;
  remainingMinutes: number | null;
  breached: boolean;
}

export interface ServiceOrderDerivedMetric {
  valueMinutes: number | null;
  isComputable: boolean;
  missingTimestamps: string[];
}

export interface ServiceOrderTimeMetrics {
  timeToDiagnosis: ServiceOrderDerivedMetric;
  timeToServiceStart: ServiceOrderDerivedMetric;
  timeToService: ServiceOrderDerivedMetric;
  timeToResolution: ServiceOrderDerivedMetric;
  timeToDelivery: ServiceOrderDerivedMetric;
}

export interface ServiceOrder {
  id: number;
  code: string;
  operativeStatus: ServiceOrderOperativeStatus;
  technicalStatus: ServiceOrderTechnicalStatus;
  commercialStatus: ServiceOrderCommercialStatus;
  economicStatus: ServiceOrderEconomicStatus;
  priority: ServiceOrderPriority;
  requestOrigin: RequestOrigin;
  clientId: number | null;
  clientContactId?: number | null;
  client?: ClientResponse | null;
  createdBy: number;
  closedBy: number | null;
  cancelledBy: number | null;
  assignedToTechnicianId: number | null;
  assignedToTechnicianName?: string | null;
  clientSnapshotName?: string | null;
  clientSnapshotDocumentTypeName?: string | null;
  clientSnapshotDocumentNumber?: string | null;
  clientSnapshotPhone?: string | null;
  clientSnapshotEmail?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  equipmentType: EquipmentType;
  equipmentTypeOther?: string | null;
  serviceType: ServiceType;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  accessories: string | null;
  initialIssue: string;
  estimatedRepairHours: number | null;
  assignedAt: string | null;
  receivedAt: string;
  reviewStartedAt: string | null;
  serviceStartedAt: string | null;
  serviceCompletedAt: string | null;
  readyForPickupAt: string | null;
  estimatedDeliveryDate: string | null;
  resolvedAt: string | null;
  deliveredAt: string | null;
  closedAt: string | null;
  cancelledAt: string | null;
  notes: string | null;
  discount: number;
  cancellationReason: string | null;
  rating: number | null;
  ratingComment: string | null;
  ratedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  montoComprometidoVigente: number;
  montoReconciliado: number;
  totalServiceOrderAgreedAmount?: number;
  sla?: ServiceOrderSla | null;
  timeMetrics?: ServiceOrderTimeMetrics | null;
}

export enum ServiceOrderOperativeStatus {
  ABIERTA = 'ABIERTA',
  EN_PROCESO = 'EN_PROCESO',
  LISTA_PARA_ENTREGA = 'LISTA_PARA_ENTREGA',
  ENTREGADA = 'ENTREGADA',
  CANCELADA = 'CANCELADA',
  CERRADA_SIN_SOLUCION = 'CERRADA_SIN_SOLUCION',
}

export enum ServiceOrderTechnicalStatus {
  PENDIENTE_ASIGNACION = 'PENDIENTE_ASIGNACION',
  ASIGNADA = 'ASIGNADA',
  EN_DIAGNOSTICO = 'EN_DIAGNOSTICO',
  DIAGNOSTICADA = 'DIAGNOSTICADA',
  PENDIENTE_DEFINICION_COMERCIAL = 'PENDIENTE_DEFINICION_COMERCIAL',
  AUTORIZADA_PARA_EJECUCION = 'AUTORIZADA_PARA_EJECUCION',
  EN_EJECUCION = 'EN_EJECUCION',
  BLOQUEADA = 'BLOQUEADA',
  ESPERANDO_REPUESTOS_O_TERCERO = 'ESPERANDO_REPUESTOS_O_TERCERO',
  RESUELTA = 'RESUELTA',
  SIN_SOLUCION = 'SIN_SOLUCION',
}

export enum ServiceOrderCommercialStatus {
  NO_REQUIERE = 'NO_REQUIERE',
  PENDIENTE_PROPUESTA = 'PENDIENTE_PROPUESTA',
  PROPUESTA_EMITIDA = 'PROPUESTA_EMITIDA',
  PENDIENTE_RESPUESTA_CLIENTE = 'PENDIENTE_RESPUESTA_CLIENTE',
  AUTORIZADA = 'AUTORIZADA',
  RECHAZADA = 'RECHAZADA',
  EXPIRADA = 'EXPIRADA',
  REEMPLAZADA = 'REEMPLAZADA',
}

export enum ServiceOrderEconomicStatus {
  NO_APLICA = 'NO_APLICA',
  PENDIENTE = 'PENDIENTE',
  PARCIAL = 'PARCIAL',
  TOTAL = 'TOTAL',
  EXONERADO = 'EXONERADO',
  REVERTIDO = 'REVERTIDO',
}

export enum ServiceOrderPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum RequestOrigin {
  CLIENT = 'CLIENT',
  INTERNAL = 'INTERNAL',
}

export enum ServiceType {
  STANDARD_SERVICE = 'STANDARD_SERVICE',
  DIAGNOSIS = 'DIAGNOSIS',
  WARRANTY_SERVICE = 'WARRANTY_SERVICE',
  ASSEMBLY = 'ASSEMBLY',
  CUSTOMER_SERVICE = 'CUSTOMER_SERVICE',
}

export enum EquipmentType {
  LAPTOP = 'LAPTOP',
  DESKTOP_PC = 'DESKTOP_PC',
  ALL_IN_ONE = 'ALL_IN_ONE',
  PRINTER = 'PRINTER',
  SCANNER = 'SCANNER',
  PROJECTOR = 'PROJECTOR',
  MONITOR = 'MONITOR',
  SERVER = 'SERVER',
  NETWORK_DEVICE = 'NETWORK_DEVICE',
  OTHER = 'OTHER',
}
