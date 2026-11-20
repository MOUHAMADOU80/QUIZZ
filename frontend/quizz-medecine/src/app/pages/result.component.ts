import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../services/api.service';
import { SessionService } from '../services/session.service';

@Component({
  standalone: true, imports: [RouterLink],
  template: `
  <section class="page-wrap result-page">
    @if (loading) { <div class="loading">Chargement du résultat…</div> }
    @else if (error) { <div class="form-card"><p class="error">{{error}}</p><a routerLink="/" class="btn btn-primary">Accueil</a></div> }
    @else {
      @if (resultat; as r) {
        <div class="result-hero">
        <span class="eyebrow">VOTRE ÉVALUATION EST TERMINÉE</span>
        <h1>Résultat du QCM</h1>
        <div class="score-circle"><strong>{{r.score ?? 0}}</strong><span>/ {{r.score_maximum ?? 50}}</span></div>
        <p>Statut : <b>{{r.statut}}</b></p>
      </div>
      <h2 class="section-title">Correction détaillée</h2>
      @for (q of r.questions; track q.id; let i = $index) {
        <article class="review-card">
          <span class="question-number">QUESTION {{q.ordre}}</span><h3>{{q.contenu}}</h3>
          @for (o of q.options; track o.id) {
            <div class="review-option" [class.correct]="o.est_correcte" [class.wrong]="o.selectionnee && !o.est_correcte">
              <span>{{o.est_correcte ? '✓' : (o.selectionnee ? '×' : '•')}}</span>{{o.contenu}}
              @if (o.selectionnee) { <small>Votre choix</small> }
            </div>
          }
        </article>
      }
      <a routerLink="/classement" class="btn btn-primary">Voir le classement →</a>
    }
  }   
  </section>
  `
})
export class ResultComponent implements OnInit {
  private api = inject(ApiService); private route = inject(ActivatedRoute); private session = inject(SessionService);
  loading = true; error = ''; resultat: any;
  ngOnInit(): void {
    const p = this.session.getParticipant(), tid = Number(this.route.snapshot.paramMap.get('tentativeId'));
    if (!p || !tid) { this.error = 'Session introuvable.'; this.loading = false; return; }
    this.api.get<any>(`/participants/${p.id}/tentative/${tid}/resultat`).subscribe({
      next: d => { this.resultat = d.resultat ?? d; this.loading = false; },
      error: e => { this.error = e.error?.message ?? 'Impossible de récupérer le résultat.'; this.loading = false; }
    });
  }
}
