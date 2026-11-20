import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  standalone: true, imports: [FormsModule],
  template: `
  <section class="form-page"><div class="form-card">
    <span class="eyebrow">ESPACE SÉCURISÉ</span><h1>Administration</h1>
    <p class="muted">Connectez-vous pour gérer la plateforme.</p>
    <form (ngSubmit)="login()">
      <label>Nom d'utilisateur</label><input name="nom_utilisateur" [(ngModel)]="username" required>
      <label>Mot de passe</label><input type="password" name="mot_de_passe" [(ngModel)]="password" required>
      @if (error) { <p class="error">{{error}}</p> }
      <button class="btn btn-primary full" [disabled]="loading">{{loading ? 'Connexion...' : 'Se connecter'}}</button>
    </form>
  </div></section>`
})
export class AdminLoginComponent {
  private api = inject(ApiService); private router = inject(Router);
  username = ''; password = ''; loading = false; error = '';
  login(): void {
    this.loading = true; this.error = '';
    this.api.post<any>('/auth/connexion', { nom_utilisateur: this.username, mot_de_passe: this.password }).subscribe({
      next: d => { sessionStorage.setItem('adminToken', d.token); this.loading = false; this.router.navigate(['/admin']); },
      error: e => { this.loading = false; this.error = e.error?.message ?? 'Identifiants incorrects.'; }
    });
  }
}
