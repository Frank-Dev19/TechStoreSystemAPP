import { Component, type OnInit } from '@angular/core';
import { FormBuilder, type FormGroup, Validators } from "@angular/forms"

export interface Cliente {
  id: number
  nombre: string
  tipoDocumento: "DNI" | "RUC" | "CE"
  numeroDocumento: string
  correo: string
  telefono: string
  activo: boolean
  fechaCreado: Date
}



@Component({
  selector: 'app-clientes',
  standalone: false,
  templateUrl: './clientes.html',
  styleUrl: './clientes.scss'
})
export class Clientes {

  // Data properties
  clientes: Cliente[] = []
  filteredClientes: Cliente[] = []
  selectedClients: number[] = []

  // Search and filter properties
  searchTerm = ""
  statusFilter = ""

  // Pagination properties
  currentPage = 1
  itemsPerPage = 10
  totalPages = 1

  // Modal properties
  showModal = false
  showConfirmModal = false
  isEditMode = false
  clientForm: FormGroup
  currentClient: Cliente | null = null

  // Confirmation properties
  confirmMessage = ""
  deleteAction: (() => void) | null = null

  // Math reference for template
  Math = Math

  constructor(private formBuilder: FormBuilder) {
    this.clientForm = this.createForm()
  }

  ngOnInit(): void {
    this.loadClientes()
    this.applyFilters()
  }

  // Form creation
  private createForm(): FormGroup {
    return this.formBuilder.group({
      nombre: ["", [Validators.required, Validators.minLength(2)]],
      tipoDocumento: ["", Validators.required],
      numeroDocumento: ["", [Validators.required, Validators.minLength(8)]],
      correo: ["", [Validators.required, Validators.email]],
      telefono: [""],
      activo: [true],
    })
  }

  // Data loading and management
  private loadClientes(): void {
    // Simulated data - replace with actual API call
    this.clientes = [
      {
        id: 1,
        nombre: "Juan Carlos Pérez García",
        tipoDocumento: "DNI",
        numeroDocumento: "12345678",
        correo: "juan.perez@email.com",
        telefono: "+51 987654321",
        activo: true,
        fechaCreado: new Date("2024-01-15"),
      },
      {
        id: 2,
        nombre: "Empresa Tecnológica SAC",
        tipoDocumento: "RUC",
        numeroDocumento: "20123456789",
        correo: "contacto@empresa.com",
        telefono: "+51 987654322",
        activo: true,
        fechaCreado: new Date("2024-02-20"),
      },
      {
        id: 3,
        nombre: "María Elena Rodriguez",
        tipoDocumento: "CE",
        numeroDocumento: "CE001234567",
        correo: "maria.rodriguez@email.com",
        telefono: "+51 987654323",
        activo: false,
        fechaCreado: new Date("2024-03-10"),
      },
      {
        id: 4,
        nombre: "Carlos Alberto Mendoza",
        tipoDocumento: "DNI",
        numeroDocumento: "87654321",
        correo: "carlos.mendoza@email.com",
        telefono: "+51 987654324",
        activo: true,
        fechaCreado: new Date("2024-03-25"),
      },
      {
        id: 5,
        nombre: "Innovación Digital EIRL",
        tipoDocumento: "RUC",
        numeroDocumento: "20987654321",
        correo: "info@innovacion.com",
        telefono: "+51 987654325",
        activo: true,
        fechaCreado: new Date("2024-04-05"),
      },
    ]
  }

  refreshData(): void {
    this.loadClientes()
    this.applyFilters()
    // Show success message or loading indicator
    console.log("Datos actualizados correctamente")
  }

  // Search and filter functionality
  onSearch(): void {
    this.currentPage = 1
    this.applyFilters()
  }

  applyFilters(): void {
    let filtered = [...this.clientes]

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase().trim()
      filtered = filtered.filter(
        (cliente) =>
          cliente.nombre.toLowerCase().includes(searchLower) ||
          cliente.numeroDocumento.toLowerCase().includes(searchLower),
      )
    }

    // Apply status filter
    if (this.statusFilter !== "") {
      const isActive = this.statusFilter === "true"
      filtered = filtered.filter((cliente) => cliente.activo === isActive)
    }

    this.filteredClientes = filtered
    this.updatePagination()
  }

  // Pagination
  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredClientes.length / this.itemsPerPage)
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++
    }
  }

  // Selection functionality
  toggleSelect(clientId: number): void {
    const index = this.selectedClients.indexOf(clientId)
    if (index > -1) {
      this.selectedClients.splice(index, 1)
    } else {
      this.selectedClients.push(clientId)
    }
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.selectedClients = []
    } else {
      this.selectedClients = this.filteredClientes.map((cliente) => cliente.id)
    }
  }

  isSelected(clientId: number): boolean {
    return this.selectedClients.includes(clientId)
  }

  isAllSelected(): boolean {
    return this.filteredClientes.length > 0 && this.selectedClients.length === this.filteredClientes.length
  }

  isIndeterminate(): boolean {
    return this.selectedClients.length > 0 && this.selectedClients.length < this.filteredClientes.length
  }

  // Modal functionality
  openCreateModal(): void {
    this.isEditMode = false
    this.currentClient = null
    this.clientForm.reset({
      nombre: "",
      tipoDocumento: "",
      numeroDocumento: "",
      correo: "",
      telefono: "",
      activo: true,
    })
    this.showModal = true
  }

  openEditModal(cliente: Cliente): void {
    this.isEditMode = true
    this.currentClient = cliente
    this.clientForm.patchValue({
      nombre: cliente.nombre,
      tipoDocumento: cliente.tipoDocumento,
      numeroDocumento: cliente.numeroDocumento,
      correo: cliente.correo,
      telefono: cliente.telefono,
      activo: cliente.activo,
    })
    this.showModal = true
  }

  closeModal(): void {
    this.showModal = false
    this.clientForm.reset()
    this.currentClient = null
  }

  saveClient(): void {
    if (this.clientForm.valid) {
      const formData = this.clientForm.value

      if (this.isEditMode && this.currentClient) {
        // Update existing client
        const index = this.clientes.findIndex((c) => c.id === this.currentClient!.id)
        if (index > -1) {
          this.clientes[index] = {
            ...this.currentClient,
            ...formData,
          }
        }
        console.log("Cliente actualizado correctamente")
      } else {
        // Create new client
        const newClient: Cliente = {
          id: Math.max(...this.clientes.map((c) => c.id)) + 1,
          ...formData,
          fechaCreado: new Date(),
        }
        this.clientes.push(newClient)
        console.log("Cliente creado correctamente")
      }

      this.applyFilters()
      this.closeModal()
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.clientForm.controls).forEach((key) => {
        this.clientForm.get(key)?.markAsTouched()
      })
    }
  }

  // Delete functionality
  confirmDelete(cliente: Cliente): void {
    this.confirmMessage = `¿Estás seguro de que deseas eliminar al cliente "${cliente.nombre}"?`
    this.deleteAction = () => this.deleteClient(cliente.id)
    this.showConfirmModal = true
  }

  confirmBulkDelete(): void {
    const count = this.selectedClients.length
    this.confirmMessage = `¿Estás seguro de que deseas eliminar ${count} cliente${count > 1 ? "s" : ""}?`
    this.deleteAction = () => this.deleteBulkClients()
    this.showConfirmModal = true
  }

  private deleteClient(clientId: number): void {
    const index = this.clientes.findIndex((c) => c.id === clientId)
    if (index > -1) {
      this.clientes.splice(index, 1)
      this.selectedClients = this.selectedClients.filter((id) => id !== clientId)
      this.applyFilters()
      console.log("Cliente eliminado correctamente")
    }
  }

  private deleteBulkClients(): void {
    this.clientes = this.clientes.filter((cliente) => !this.selectedClients.includes(cliente.id))
    this.selectedClients = []
    this.applyFilters()
    console.log("Clientes eliminados correctamente")
  }

  executeDelete(): void {
    if (this.deleteAction) {
      this.deleteAction()
      this.closeConfirmModal()
    }
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false
    this.confirmMessage = ""
    this.deleteAction = null
  }

  // Utility functions
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat("es-PE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(date))
  }

  getDocTypeClass(tipoDocumento: string): string {
    return tipoDocumento.toLowerCase()
  }

}
