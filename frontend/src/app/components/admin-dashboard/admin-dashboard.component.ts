import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  
  displayedColumns: string[] = ['nombre_completo', 'grado', 'grupo', 'correo_institucional', 'total_respuestas', 'respuestas_correctas', 'puntuacion', 'fecha_registro'];
  dataSource = new MatTableDataSource<any>([]);
  topScores: any[] = [];
  stats: any = null;
  isLoading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // Chart configurations
  public barChartType: ChartType = 'bar';
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      title: {
        display: true,
        text: 'Distribución de Puntuaciones',
        font: {
          size: 16
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100
      }
    }
  };

  public barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Número de Estudiantes',
        backgroundColor: 'rgba(102, 126, 234, 0.6)',
        borderColor: 'rgba(102, 126, 234, 1)',
        borderWidth: 2
      }
    ]
  };

  public pieChartType: ChartType = 'pie';
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right'
      },
      title: {
        display: true,
        text: 'Distribución por Rango de Puntuación',
        font: {
          size: 16
        }
      }
    }
  };

  public pieChartData: ChartData<'pie'> = {
    labels: ['Excelente (90-100%)', 'Bueno (80-89%)', 'Regular (60-79%)', 'Necesita Mejorar (<60%)'],
    datasets: [
      {
        data: [0, 0, 0, 0],
        backgroundColor: [
          'rgba(76, 175, 80, 0.8)',
          'rgba(139, 195, 74, 0.8)',
          'rgba(255, 152, 0, 0.8)',
          'rgba(244, 67, 54, 0.8)'
        ],
        borderColor: [
          'rgba(76, 175, 80, 1)',
          'rgba(139, 195, 74, 1)',
          'rgba(255, 152, 0, 1)',
          'rgba(244, 67, 54, 1)'
        ],
        borderWidth: 2
      }
    ]
  };

  public lineChartType: ChartType = 'line';
  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      title: {
        display: true,
        text: 'Precisión por Pregunta',
        font: {
          size: 16
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100
      }
    }
  };

  public lineChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: '% Correcto',
        borderColor: 'rgba(102, 126, 234, 1)',
        backgroundColor: 'rgba(102, 126, 234, 0.2)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.hasAdminToken()) {
      this.router.navigate(['/admin/login']);
      return;
    }
    
    // Initialize filter predicate
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      const searchStr = filter.toLowerCase();
      return (
        (data.nombre_completo || '').toLowerCase().includes(searchStr) ||
        (data.correo_institucional || '').toLowerCase().includes(searchStr) ||
        (data.grado || '').toString().includes(searchStr) ||
        (data.grupo || '').toLowerCase().includes(searchStr) ||
        (data.puntuacion || 0).toString().includes(searchStr) ||
        (data.total_respuestas || 0).toString().includes(searchStr) ||
        (data.respuestas_correctas || 0).toString().includes(searchStr)
      );
    };
    
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  loadData(): void {
    this.isLoading = true;
    
    // Clear any existing filters
    this.dataSource.filter = '';

    // Load results
    this.apiService.getResults().subscribe({
      next: (results) => {
        // Normalize data to ensure numeric values
        const normalizedResults = results.map((result: any) => ({
          ...result,
          puntuacion: this.getNumericScore(result.puntuacion),
          total_respuestas: Number(result.total_respuestas) || 0,
          respuestas_correctas: Number(result.respuestas_correctas) || 0
        }));
        this.dataSource.data = normalizedResults;
        this.updateCharts(normalizedResults);
        
        // Update paginator after data is loaded (use setTimeout to ensure view is updated)
        setTimeout(() => {
          if (this.paginator) {
            this.dataSource.paginator = this.paginator;
            // Reset to first page
            this.paginator.firstPage();
          }
        }, 0);
        
        this.isLoading = false;
      },
      error: (error) => {
        if (error.status === 401 || error.status === 403) {
          this.authService.adminLogout();
          this.router.navigate(['/admin/login']);
        }
        this.isLoading = false;
      }
    });

    // Load top scores
    this.apiService.getTopScores().subscribe({
      next: (scores) => {
        this.topScores = scores;
      },
      error: (error) => {
        // Error loading top scores
      }
    });

    // Load stats
    this.apiService.getStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.updateQuestionChart(stats.question_stats);
      },
      error: (error) => {
        // Error loading stats
      }
    });
  }

  updateCharts(results: any[]): void {
    // Update bar chart with score distribution
    const scoreRanges = {
      '90-100': 0,
      '80-89': 0,
      '60-79': 0,
      '0-59': 0
    };

    results.forEach(result => {
      const score = result.puntuacion || 0;
      if (score >= 90) scoreRanges['90-100']++;
      else if (score >= 80) scoreRanges['80-89']++;
      else if (score >= 60) scoreRanges['60-79']++;
      else scoreRanges['0-59']++;
    });

    this.barChartData = {
      labels: ['90-100%', '80-89%', '60-79%', '0-59%'],
      datasets: [
        {
          data: [
            scoreRanges['90-100'],
            scoreRanges['80-89'],
            scoreRanges['60-79'],
            scoreRanges['0-59']
          ],
          label: 'Número de Estudiantes',
          backgroundColor: [
            'rgba(76, 175, 80, 0.6)',
            'rgba(139, 195, 74, 0.6)',
            'rgba(255, 152, 0, 0.6)',
            'rgba(244, 67, 54, 0.6)'
          ],
          borderColor: [
            'rgba(76, 175, 80, 1)',
            'rgba(139, 195, 74, 1)',
            'rgba(255, 152, 0, 1)',
            'rgba(244, 67, 54, 1)'
          ],
          borderWidth: 2
        }
      ]
    };

    // Update pie chart
    this.pieChartData = {
      ...this.pieChartData,
      datasets: [
        {
          ...this.pieChartData.datasets[0],
          data: [
            scoreRanges['90-100'],
            scoreRanges['80-89'],
            scoreRanges['60-79'],
            scoreRanges['0-59']
          ]
        }
      ]
    };

    if (this.chart) {
      this.chart.update();
    }
  }

  updateQuestionChart(questionStats: any[]): void {
    if (!questionStats || questionStats.length === 0) return;

    const labels = questionStats.map((stat, index) => `P${index + 1}`);
    const data = questionStats.map(stat => stat.porcentaje_correcto || 0);

    this.lineChartData = {
      labels: labels,
      datasets: [
        {
          data: data,
          label: '% Correcto',
          borderColor: 'rgba(102, 126, 234, 1)',
          backgroundColor: 'rgba(102, 126, 234, 0.2)',
          fill: true,
          tension: 0.4
        }
      ]
    };

    if (this.chart) {
      this.chart.update();
    }
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  refreshData(): void {
    // Verify admin token is available before refreshing
    if (!this.authService.hasAdminToken()) {
      this.router.navigate(['/admin/login']);
      return;
    }
    this.loadData();
  }

  logout(): void {
    this.authService.adminLogout();
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getNumericScore(score: any): number {
    if (score === null || score === undefined || score === '') {
      return 0;
    }
    const num = typeof score === 'string' ? parseFloat(score) : Number(score);
    return isNaN(num) ? 0 : num;
  }

  formatScore(score: any): string {
    const numScore = this.getNumericScore(score);
    return numScore.toFixed(2);
  }

  getScoreColor(score: number | any): string {
    const numScore = this.getNumericScore(score);
    if (numScore >= 90) return '#4caf50';
    if (numScore >= 80) return '#8bc34a';
    if (numScore >= 60) return '#ff9800';
    return '#f44336';
  }
}
