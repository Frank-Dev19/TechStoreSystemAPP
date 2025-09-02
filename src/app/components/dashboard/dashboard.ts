import { Component } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexTitleSubtitle,
} from 'ng-apexcharts';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard {

  // Gráfico de barras
  chartSeries: ApexAxisChartSeries = [
    {
      name: 'Ventas',
      data: [20, 30, 40, 35, 50, 49, 60, 70, 91, 125, 100, 110],
    },
  ];
  chartDetails: ApexChart = { type: 'bar', height: 350 };
  chartTitle: ApexTitleSubtitle = { text: 'Ventas Mensuales', align: 'center' };
  chartXAxis: ApexXAxis = {
    categories: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  };

  // Gráfico de líneas
  lineChartSeries: ApexAxisChartSeries = [
    {
      name: 'Ingreso',
      data: [200, 400, 300, 500, 600, 800, 700, 950, 1000, 1200, 1500, 1800],
    },
  ];
  lineChartDetails: ApexChart = { type: 'line', height: 350 };
  lineChartTitle: ApexTitleSubtitle = { text: 'Ingresos Mensuales', align: 'center' };
  lineChartXAxis: ApexXAxis = {
    categories: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  };

  // Gráfico de área
  areaChartSeries: ApexAxisChartSeries = [
    {
      name: 'Usuarios',
      data: [5, 20, 15, 30, 35, 50, 60, 70, 80, 90, 100, 120],
    },
  ];
  areaChartDetails: ApexChart = { type: 'area', height: 350 };
  areaChartTitle: ApexTitleSubtitle = { text: 'Usuarios Registrados', align: 'center' };
  areaChartXAxis: ApexXAxis = {
    categories: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  };

  // Gráfico circular
  pieChartSeries: ApexNonAxisChartSeries = [44, 55, 13, 43];
  pieChartDetails: ApexChart = { type: 'pie', height: 350 };
  pieChartTitle: ApexTitleSubtitle = { text: 'Distribución de Ventas', align: 'center' };

  // Función para actualizar los datos
  actualizarDatos() {
    this.chartSeries = [
      {
        name: 'Ventas',
        data: Array.from({ length: 12 }, () => Math.floor(Math.random() * 150)),
      },
    ];
    this.lineChartSeries = [
      {
        name: 'Ingreso',
        data: Array.from({ length: 12 }, () => Math.floor(Math.random() * 1500)),
      },
    ];
    this.areaChartSeries = [
      {
        name: 'Usuarios',
        data: Array.from({ length: 12 }, () => Math.floor(Math.random() * 120)),
      },
    ];
    this.pieChartSeries = [44, 55, 13, 43]; // Simular cambio de datos
  }

}
