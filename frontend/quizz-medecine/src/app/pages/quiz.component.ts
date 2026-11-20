import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { SessionService } from '../services/session.service';
import { Question, OptionQcm, Tentative } from '../models';

@Component({
  standalone: true,
  template: `
  <section class="quiz-shell" [hidden]="loading">
    <div class="quiz-head">
      <div><span class="eyebrow">QUIZZ_MEDECINE</span><h1>Évaluation des connaissances</h1></div>
      <div class="timer" [class.timer-warning]="remaining <= 300">◷ {{formatTime()}}</div>
    </div>
    <div class="progress-track"><div class="progress-value" [style.width.%]="progress"></div></div>
    <div class="quiz-meta"><span>Question {{index+1}} / {{questions.length || 50}}</span><span>{{answeredCount}} réponse(s) renseignée(s)</span></div>
    @if (current; as q) {
      <article class="question-card">
        <div class="question-number">QUESTION {{q.ordre}}</div>
        <h2>{{q.contenu}}</h2>
        <p class="muted small">Plusieurs réponses peuvent être correctes. Sélectionnez toutes celles qui vous semblent justes.</p>
        <div class="options-list">
          @for (o of q.options; track o.id; let i = $index) {
            <button type="button" class="option" [class.selected]="isSelected(o.id)" (click)="toggle(o.id)">
              <span class="option-letter">{{letters[i]}}</span><span>{{o.contenu}}</span><span class="check">{{isSelected(o.id) ? '✓' : ''}}</span>
            </button>
          }
        </div>
      </article>
      <div class="quiz-controls">
        <button class="btn btn-outline" (click)="previous()" [disabled]="index===0">← Précédente</button>
        @if (index < questions.length-1) {
          <button class="btn btn-primary" (click)="next()">Suivante →</button>
        } @else {
          <button class="btn btn-primary" (click)="submit()">Soumettre le QCM</button>
        }
      </div>
    }
    @if (error) { <p class="error">{{error}}</p> }
  </section>
  @if (loading) { <div class="loading">Chargement du QCM…</div> }
  `
})
export class QuizComponent implements OnInit, OnDestroy {
  private api = inject(ApiService); private session = inject(SessionService);
  private router = inject(Router);
  questions: Question[] = []; answers = new Map<number, number[]>();
  index = 0; remaining = 1800; loading = true; error = '';
  letters = ['A','B','C','D']; timer?: ReturnType<typeof setInterval>;
  get current(): Question | undefined { return this.questions[this.index]; }
  get progress(): number { return this.questions.length ? ((this.index+1)/this.questions.length)*100 : 0; }
  get answeredCount(): number { return this.answers.size; }

  ngOnInit(): void {
    const p = this.session.getParticipant(), t = this.session.getTentative();
    if (!p || !t) { this.router.navigate(['/identification']); return; }
    this.api.get<any>('/quiz/actif/questions').subscribe({
      next: data => {
        this.questions = data.questions ?? data.quiz?.questions ?? [];
        this.loading = false;
        this.loadTime(p.id, t.id);
        this.timer = setInterval(() => {
          if (this.remaining > 0) this.remaining--;
          else this.finishExpired();
        }, 1000);
      },
      error: e => { this.loading = false; this.error = e.error?.message ?? 'Impossible de charger les questions.'; }
    });
  }
  loadTime(pid: number, tid: number): void {
    this.api.get<any>(`/participants/${pid}/tentative/${tid}/temps`).subscribe({
      next: d => { if (typeof d.temps_restant === 'number') this.remaining = d.temps_restant; }
    });
  }
  isSelected(id: number): boolean { return (this.answers.get(this.current?.id ?? -1) ?? []).includes(id); }
  toggle(id: number): void {
    if (!this.current) return;
    const qid = this.current.id, selected = this.answers.get(qid) ?? [];
    const next = selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id];
    this.answers.set(qid, next);
    const p = this.session.getParticipant(), t = this.session.getTentative();
    if (p && t) this.api.post(`/participants/${p.id}/tentative/${t.id}/reponses`,
      { question_id: qid, options: next }).subscribe({ error: e => this.error = e.error?.message ?? 'Erreur d’enregistrement.' });
  }
  previous(): void { if (this.index > 0) this.index--; }
  next(): void { if (this.index < this.questions.length-1) this.index++; }
  formatTime(): string { return `${Math.floor(this.remaining/60).toString().padStart(2,'0')}:${(this.remaining%60).toString().padStart(2,'0')}`; }
  submit(): void {
    if (this.answers.size < this.questions.length && this.remaining > 0) {
      this.error = 'Répondez à toutes les questions avant de soumettre.'; return;
    }
    this.finish();
  }
  private finishExpired(): void { this.finish(); }
  private finish(): void {
    const p = this.session.getParticipant(), t = this.session.getTentative();
    if (!p || !t) return;
    clearInterval(this.timer);
    this.api.post<any>(`/participants/${p.id}/tentative/${t.id}/soumettre`, {}).subscribe({
      next: () => this.router.navigate(['/resultat', t.id]),
      error: e => { this.error = e.error?.message ?? 'La soumission a échoué.'; }
    });
  }
  ngOnDestroy(): void { clearInterval(this.timer); }
}
