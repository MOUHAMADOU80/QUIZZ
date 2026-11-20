import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="topbar">
      <a class="brand" routerLink="/">
        <span class="brand-mark">Q</span>
        <span>QUIZZ<span class="brand-light">_MEDECINE</span></span>
      </a>
      <nav>
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Accueil</a>
        <a routerLink="/classement" routerLinkActive="active">Classement</a>
      </nav>
      <a class="admin-link" routerLink="/admin/connexion">Administration</a>
    </header>
    <main><router-outlet /></main>
    <footer>© 2026 QUIZZ_MEDECINE · Évaluation des connaissances</footer>
  `
})
export class AppComponent {}
