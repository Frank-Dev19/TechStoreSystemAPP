import { Component, OnInit } from '@angular/core';
import { Router } from "@angular/router"
@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit {

  // Metrics Data
  totalSales = 125750.5
  totalProducts = 1247
  activeServices = 23
  totalClients = 342

  // Category Data
  ramCount = 156
  storageCount = 234
  peripheralsCount = 445
  printersCount = 89

  // Stock Percentages (for progress bars)
  ramStock = 75
  storageStock = 60
  peripheralsStock = 85
  printersStock = 40

  // Recent Sales Data
  recentSales = [
    {
      product: "RAM DDR4 16GB",
      client: "TechCorp S.A.",
      time: "Hace 2 horas",
      amount: 450.0,
    },
    {
      product: "SSD 1TB Samsung",
      client: "Innovación Digital",
      time: "Hace 4 horas",
      amount: 280.0,
    },
    {
      product: "Micrófono USB",
      client: "Estudio Creativo",
      time: "Hace 6 horas",
      amount: 125.0,
    },
    {
      product: "Impresora HP LaserJet",
      client: "Oficina Central",
      time: "Ayer",
      amount: 850.0,
    },
  ]

  // Pending Services Data
  pendingServices = [
    {
      type: "Mantenimiento PC",
      client: "Empresa ABC",
      scheduledDate: "Hoy 14:00",
      priority: "alta",
    },
    {
      type: "Instalación RAM",
      client: "Usuario Premium",
      scheduledDate: "Mañana 10:00",
      priority: "media",
    },
    {
      type: "Reparación Impresora",
      client: "Oficina Legal",
      scheduledDate: "Mañana 16:00",
      priority: "baja",
    },
    {
      type: "Configuración Red",
      client: "StartUp Tech",
      scheduledDate: "Viernes 09:00",
      priority: "alta",
    },
  ]

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.loadDashboardData()
    this.startRealTimeUpdates()
  }

  /**
   * Navigate to specific module
   */
  navigateToModule(module: string): void {
    switch (module) {
      case "clientes":
        this.router.navigate(["/clientes"])
        break
      case "proveedores":
        this.router.navigate(["/proveedores"])
        break
      case "productos":
        this.router.navigate(["/productos"])
        break
      case "servicios":
        this.router.navigate(["/servicios"])
        break
      case "ventas":
        this.router.navigate(["/ventas"])
        break
      case "reportes":
        this.router.navigate(["/reportes"])
        break
      case "configuracion":
        this.router.navigate(["/configuracion"])
        break
      default:
        console.log("Módulo no encontrado:", module)
    }
  }

  /**
   * Load dashboard data from API
   */
  private loadDashboardData(): void {
    // TODO: Implement API calls to load real data
    // This is placeholder data for demonstration

    // Example API calls:
    // this.dashboardService.getMetrics().subscribe(data => {
    //   this.totalSales = data.totalSales;
    //   this.totalProducts = data.totalProducts;
    //   this.activeServices = data.activeServices;
    //   this.totalClients = data.totalClients;
    // });

    // this.dashboardService.getRecentSales().subscribe(data => {
    //   this.recentSales = data;
    // });

    // this.dashboardService.getPendingServices().subscribe(data => {
    //   this.pendingServices = data;
    // });

    // this.dashboardService.getCategoryStats().subscribe(data => {
    //   this.ramCount = data.ram.count;
    //   this.ramStock = data.ram.stockPercentage;
    //   // ... etc for other categories
    // });

    console.log("[v0] Dashboard data loaded successfully")
  }

  /**
   * Start real-time updates for metrics
   */
  private startRealTimeUpdates(): void {
    // TODO: Implement WebSocket or polling for real-time updates
    // Example:
    // setInterval(() => {
    //   this.loadDashboardData();
    // }, 30000); // Update every 30 seconds

    console.log("[v0] Real-time updates initialized")
  }

  /**
   * Refresh dashboard data manually
   */
  refreshDashboard(): void {
    console.log("[v0] Refreshing dashboard data...")
    this.loadDashboardData()
  }

  /**
   * Get greeting based on time of day
   */
  getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) {
      return "Buenos días"
    } else if (hour < 18) {
      return "Buenas tardes"
    } else {
      return "Buenas noches"
    }
  }

  /**
   * Format currency values
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(value)
  }

  /**
   * Get stock status color
   */
  getStockStatusColor(percentage: number): string {
    if (percentage >= 70) return "#2ecc71"
    if (percentage >= 40) return "#f39c12"
    return "#e74c3c"
  }

  /**
   * Handle card click animations
   */
  onCardClick(event: Event): void {
    const card = event.currentTarget as HTMLElement
    card.style.transform = "scale(0.98)"
    setTimeout(() => {
      card.style.transform = ""
    }, 150)
  }
}
