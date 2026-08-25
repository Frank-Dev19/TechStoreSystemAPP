import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { PublicOrderSurvey, PublicOrderSurveyService } from '../../services/service-orders/public-order-survey.service';

type SurveyState = 'loading' | 'available' | 'submitting' | 'answered' | 'expired' | 'invalid';

@Component({
  selector: 'app-order-survey',
  standalone: false,
  templateUrl: './order-survey.html',
  styleUrls: ['./order-survey.scss'],
})
export class OrderSurvey implements OnInit {
  readonly ratings = [1, 2, 3, 4, 5];
  readonly ratingLabels = ['Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente'];
  state: SurveyState = 'loading';
  survey: PublicOrderSurvey | null = null;
  form: FormGroup;
  private token = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly surveyService: PublicOrderSurveyService,
    formBuilder: FormBuilder,
  ) {
    this.form = formBuilder.group({
      overallRating: [null, [Validators.required, Validators.min(1), Validators.max(5)]],
      attentionRating: [null, [Validators.required, Validators.min(1), Validators.max(5)]],
      serviceQualityRating: [null, [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: ['', [Validators.maxLength(1000)]],
    });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.state = 'invalid';
      return;
    }
    this.surveyService.get(this.token).subscribe({
      next: (survey) => {
        this.survey = survey;
        this.state = survey.status === 'ANSWERED' ? 'answered' : 'available';
      },
      error: (error: HttpErrorResponse) => {
        this.state = error.status === 410 ? 'expired' : error.status === 409 ? 'answered' : 'invalid';
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.state !== 'available') {
      this.form.markAllAsTouched();
      return;
    }
    this.state = 'submitting';
    this.surveyService.submit(this.token, this.form.getRawValue()).subscribe({
      next: () => (this.state = 'answered'),
      error: (error: HttpErrorResponse) => {
        if (error.status === 409) this.state = 'answered';
        else if (error.status === 410) this.state = 'expired';
        else this.state = 'available';
      },
    });
  }

  selectRating(controlName: string, rating: number): void {
    this.form.get(controlName)?.setValue(rating);
    this.form.get(controlName)?.markAsTouched();
  }
}
