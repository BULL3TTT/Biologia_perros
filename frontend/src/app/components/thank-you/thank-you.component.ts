import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-thank-you',
  templateUrl: './thank-you.component.html',
  styleUrls: ['./thank-you.component.scss']
})
export class ThankYouComponent implements OnInit {
  score: any = null;
  userData: any = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.score = this.authService.getScore();
    this.userData = this.authService.getUserData();

    if (!this.score) {
      this.router.navigate(['/']);
    }
  }

  getScorePercentage(): number {
    return this.score?.score || 0;
  }

  getScoreColor(): string {
    const percentage = this.getScorePercentage();
    if (percentage >= 80) return '#4caf50';
    if (percentage >= 60) return '#ff9800';
    return '#f44336';
  }

  getScoreMessage(): string {
    const percentage = this.getScorePercentage();
    if (percentage >= 90) return '¡Excelente trabajo!';
    if (percentage >= 80) return '¡Muy bien!';
    if (percentage >= 60) return 'Buen intento';
    return 'Sigue practicando';
  }

  goHome(): void {
    this.authService.clearAll();
    this.router.navigate(['/']);
  }
}

