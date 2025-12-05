import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: string;
}

@Component({
  selector: 'app-questions-form',
  templateUrl: './questions-form.component.html',
  styleUrls: ['./questions-form.component.scss']
})
export class QuestionsFormComponent implements OnInit {
  Math = Math;
  questions: Question[] = [
    {
      id: 1,
      text: '¿Como se llama el triplete de nucleos que el ribosoma lee? Contiene la informacion para unir un aminoacido especifico?',
      options: ['ARN POLIMERASA', 'AMINOACIDO', 'ADN POLIMERASA', 'CODON'],
      correctAnswer: 'CODON'
    },
    {
      id: 2,
      text: '¿QUE DIFERENCIA IMPORTANTE EXISTE ENTRE EL ADN Y EL ARN?',
      options: ['EL ADN NO SE TRADUCE', 'EL ARN SE COPIA DEL ADN', 'EL ARN CONTIENE URACILO', 'EL ARN CONTIENE TIMINA'],
      correctAnswer: 'EL ARN CONTIENE URACILO'
    },
    {
      id: 3,
      text: '¿CUAL ES LA FUNCION DEL SPLICING Y EN QUE ETAPA DEL DOGMA CENTRAL DE LA BIOLOGIA PARTICIPA?',
      options: [
        'RETIRAR LOS INTRONES - TRADUCCION',
        'RETIRAR LOS EXONES - TRANSCRIPCION',
        'RETIRAR LOS INTRONES - TRANSCRIPCION',
        'RETIRAR LOS EXONES - REPLICACION'
      ],
      correctAnswer: 'RETIRAR LOS INTRONES - TRANSCRIPCION'
    },
    {
      id: 4,
      text: 'LA TRADUCCION ES UN PROCESO QUE PERMITE FORMAR',
      options: ['ADN', 'PROTEINAS', 'BASES NITROGENADAS', 'ARN MENSAJERO'],
      correctAnswer: 'PROTEINAS'
    },
    {
      id: 5,
      text: '¿QUE ES EL PROCESO DE TRANSCRIPCION?',
      options: [
        'ES EL PROCESO DE DUPLICACION DEL ADN',
        'ES EL PROCESO DE TRADUCCION DEL ADN',
        'ES EL PROCESO DE SINTESIS DE ADN',
        'ES EL PROCESO DE SINTESIS DE ARN'
      ],
      correctAnswer: 'ES EL PROCESO DE SINTESIS DE ARN'
    },
    {
      id: 6,
      text: '¿QUE CODON SEÑALA DONDE COMIENZA LA TRADUCCION?',
      options: ['UAA', 'AUG', 'UAG', 'UCGA'],
      correctAnswer: 'AUG'
    },
    {
      id: 7,
      text: 'MECANISMOS INVOLUCRADOS EN LA SINTESIS DE UNA PROTEINA',
      options: [
        'REPLICACION Y MITOSIS',
        'TRANSCRIPCION Y REPLICACION',
        'REPLICACION Y TRADUCCION',
        'TRANSCRIPCION Y TRADUCCION'
      ],
      correctAnswer: 'TRANSCRIPCION Y TRADUCCION'
    },
    {
      id: 8,
      text: '¿A QUE SE DEBE SOMETER EL TRANSCRITO DE ARN EN EUCARIOTAS?',
      options: ['DECODIFICACION', 'CORTE Y EMPALME', 'TRANSCRIPCION', 'TRADUCCION'],
      correctAnswer: 'CORTE Y EMPALME'
    },
    {
      id: 9,
      text: 'A QUE SE REFIERE EL DOGMA CENTRAL DE LA BIOLOGIA',
      options: [
        'TODAS LAS CELULAS PROVIENEN DE OTRA CELULA',
        'A LA PRODUCCION DE ENERGIA EN LA MITOCONDRIA',
        'A LA OBTENCION DE ENERGIA DE FUENTES EXTERNAS A LA CELULA',
        'FLUJO DE INFORMACION GENETICA DE DNA A PROTEINA'
      ],
      correctAnswer: 'FLUJO DE INFORMACION GENETICA DE DNA A PROTEINA'
    },
    {
      id: 10,
      text: 'LOS CODONES SON TRIPLETES DE ___ PRESENTES EN ___',
      options: [
        'BASES NITROGENADAS - ARNm',
        'AMINOACIDOS - ARNr',
        'BASES NITROGENADAS - ARNt',
        'AMINOACIDOS - PROTEINAS'
      ],
      correctAnswer: 'BASES NITROGENADAS - ARNm'
    },
    {
      id: 11,
      text: 'ENZIMA QUE ROMPE LOS PUENTES DE HIDROGENO, DESENRROLLANDOLOS EN 2 CADENAS ANTIPARALELAS',
      options: ['PRISMA', 'TOPOISOMERASA', 'ADN HELICASA', 'N.A'],
      correctAnswer: 'ADN HELICASA'
    },
    {
      id: 12,
      text: 'EL ADN NO CONTIENE',
      options: ['TIMINA', 'ADENINA', 'URACILO', 'GUANINA', 'CITOSINA'],
      correctAnswer: 'URACILO'
    },
    {
      id: 13,
      text: 'EL ARN NO CONTIENE',
      options: ['ADENINA', 'GUANINA', 'CITOSINA', 'TIMINA', 'URACILO'],
      correctAnswer: 'TIMINA'
    },
    {
      id: 14,
      text: 'ENZIMA QUE UNE LOS FRAGMENTOS DE OKAZAKI',
      options: ['N.A', 'LIGASA', 'ARN', 'POLIMERASA'],
      correctAnswer: 'LIGASA'
    },
    {
      id: 15,
      text: 'ENZIMA QUE DESARROLLA LA CADENA DE ADN',
      options: ['TOPOISOMERASA', 'N.A', 'PRIMASA', 'SEMICONSERVATIVA'],
      correctAnswer: 'TOPOISOMERASA'
    },
    {
      id: 16,
      text: 'ENZIMA ENCARGADA DE LA SINTESIS DE LOS PRIMEROS CREADORES PARA LA SINTESIS DE ADN',
      options: ['TOPOISOMERASA', 'PRIMASA', 'N.A', 'ADN HELICASA'],
      correctAnswer: 'PRIMASA'
    },
    {
      id: 17,
      text: 'FRAGMENTO DE ADN QUE SE SINTETIZA EN CONTRA DE LA DIRECCION DE LA HORQUILLA DE REPLICACION',
      options: [
        'FRAGMENTOS DE OKAZAKI',
        'FRAGMENTOS DE ISHIKAWA',
        'FRAGMENTOS DE TANOKA',
        'FRAGMENTOS DE YAMADA'
      ],
      correctAnswer: 'FRAGMENTOS DE OKAZAKI'
    }
  ];

  answers: { [key: number]: string } = {};
  currentQuestionIndex = 0; // Índice de la pregunta actual (0-16)
  isLoading = false;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    if (!this.authService.hasToken()) {
      this.router.navigate(['/']);
    }
  }

  getCurrentQuestion(): Question {
    return this.questions[this.currentQuestionIndex];
  }

  getCurrentQuestionNumber(): number {
    return this.currentQuestionIndex + 1;
  }

  getTotalQuestions(): number {
    return this.questions.length;
  }

  selectAnswer(questionId: number, answer: string): void {
    this.answers[questionId] = answer;
  }

  isAnswerSelected(questionId: number, option: string): boolean {
    return this.answers[questionId] === option;
  }

  getAnsweredCount(): number {
    return Object.keys(this.answers).length;
  }

  canGoNext(): boolean {
    const currentQuestion = this.getCurrentQuestion();
    return !!this.answers[currentQuestion.id];
  }

  isLastQuestion(): boolean {
    return this.currentQuestionIndex === this.questions.length - 1;
  }

  canSubmit(): boolean {
    return this.getAnsweredCount() === this.questions.length;
  }

  nextQuestion(): void {
    if (this.canGoNext() && !this.isLastQuestion()) {
      this.currentQuestionIndex++;
    }
  }

  getProgressPercentage(): number {
    return ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
  }

  submitAnswers(): void {
    if (!this.canSubmit()) {
      this.snackBar.open('Por favor responde todas las preguntas', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    // Convert answers object to ensure each number is a property with string keys
    // Build object with explicit string keys to ensure JSON serialization uses strings
    const answersToSend: { [key: string]: string } = {};
    for (const questionId in this.answers) {
      if (this.answers.hasOwnProperty(questionId)) {
        const stringKey = String(questionId);
        answersToSend[stringKey] = String(this.answers[questionId]);
      }
    }
    
    this.apiService.submitAnswers(answersToSend).subscribe({
      next: (response) => {
        this.authService.setScore(response);
        this.router.navigate(['/thank-you']);
      },
      error: (error) => {
        this.isLoading = false;
        this.snackBar.open(
          error.error?.error || 'Error al enviar respuestas. Por favor intenta de nuevo.',
          'Cerrar',
          { duration: 5000 }
        );
      }
    });
  }
}

