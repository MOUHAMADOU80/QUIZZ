import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { SessionService } from '../services/session.service';
import { Participant, Tentative } from '../models';

@Component({
  standalone: true, imports: [FormsModule],
  template: `
  <section class="form-page">
    <div class="form-card">
      <a routerLink="/" class="back-link" (click)="$event.preventDefault(); router.navigate(['/'])">← Retour à l'accueil</a>
      <span class="eyebrow">AVANT DE COMMENCER</span>
      <h1>Votre identification</h1>
      <p class="muted">Ces informations serviront à enregistrer votre participation et votre résultat.</p>
      <form (ngSubmit)="start()">
        <label>Nom</label><input name="nom" [(ngModel)]="nom" placeholder="Votre nom" required>
        <label>Prénom</label><input name="prenom" [(ngModel)]="prenom" placeholder="Votre prénom" required>
        <label>Cycle d'études</label>
        <select name="cycle" [(ngModel)]="cycle" required>
          <option value="Licence">Licence</option><option value="Master">Master</option><option value="Docteur">Docteur</option>
        </select>
        @if (error) { <p class="error">{{error}}</p> }
        <button class="btn btn-primary full" [disabled]="loading">{{loading ? 'Préparation...' : 'Continuer vers le QCM →'}}</button>
      </form>
      <p class="privacy-note">Aucune adresse e-mail ni photo n'est demandée.</p>
    </div>
  </section>
  `
})
export class IdentificationComponent {
  private api = inject(ApiService);
  private session = inject(SessionService);
  router = inject(Router);
  nom = ''; prenom = ''; cycle: Participant['cycle'] = 'Licence';
  loading = false; error = '';

  start(): void {
    if (!this.nom.trim() || !this.prenom.trim()) return;
    this.loading = true; this.error = '';
    this.api.post<any>('/participants', {
      nom: this.nom.trim(), prenom: this.prenom.trim(), cycle: this.cycle
    }).subscribe({
      next: p => {
        const participant: Participant = p.participant ?? p;
        this.session.setParticipant(participant);
        this.api.post<any>(`/participants/${participant.id}/tentative`, {}).subscribe({
          next: t => {
            const tentative: Tentative = t.tentative ?? t;
            this.session.setTentative(tentative);
            this.loading = false; this.router.navigate(['/quiz']);
          },
          error: e => { this.loading = false; this.error = e.error?.message ?? 'Impossible de démarrer le QCM.'; }
        });
      },
      error: e => { this.loading = false; this.error = e.error?.message ?? 'Erreur lors de votre identification.'; }
    });
  }
}
