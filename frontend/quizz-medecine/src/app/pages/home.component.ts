
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';

interface Quiz {
  id: number;
  titre: string;
  description: string;
  duree_minutes: number;
  nombre_questions: number;
}

@Component({
  standalone: true,
  imports: [RouterLink, CommonModule],
  template: `
  @if (chargement) {
    <section class="page-wrap">
      <p>Chargement du quiz...</p>
    </section>
  } @else if (erreur) {
    <section class="page-wrap">
      <p>{{ erreur }}</p>
    </section>
  } @else if (quiz) {
    <section class="hero page-wrap">
      <div class="hero-copy">
        <span class="eyebrow"><span class="pulse"></span> PLATEFORME D'ÉVALUATION</span>

        <h1>Testez vos connaissances.<br><span>Progressez chaque jour.</span></h1>

        <p class="lead">{{ quiz.description }}</p>

        <div class="hero-actions">
          <a class="btn btn-primary" routerLink="/identification">
            Commencer le QCM <span>→</span>
          </a>
          <a class="btn btn-outline" routerLink="/classement">
            Voir le classement
          </a>
        </div>

        <div class="quick-facts">
          <div>
            <strong>{{ quiz.nombre_questions }}</strong>
            <small>Questions</small>
          </div>
          <div>
            <strong>{{ quiz.duree_minutes }} min</strong>
            <small>Durée</small>
          </div>
          <div>
            <strong>4</strong>
            <small>Propositions / question</small>
          </div>
        </div>
      </div>

      <div class="hero-art" aria-hidden="true">
        <div class="orbit orbit-one"></div>
        <div class="orbit orbit-two"></div>

        <div class="medical-card">
          <div class="medical-cross">+</div>
          <div class="wave-line"></div>
          <div class="art-caption">
            <span class="art-dot"></span> {{ quiz.titre }}
          </div>
        </div>

        <div class="floating-note note-top">✓ Évaluation simple</div>
        <div class="floating-note note-bottom">
          ⏱ {{ quiz.duree_minutes }} minutes
        </div>
      </div>
    </section>

    <section class="page-wrap info-grid">
      <article class="info-card">
        <span class="info-icon">01</span>
        <h3>Identifiez-vous</h3>
        <p>Renseignez votre nom, prénom et cycle d'études.</p>
      </article>

      <article class="info-card">
        <span class="info-icon">02</span>
        <h3>Répondez</h3>
        <p>Parcourez les {{ quiz.nombre_questions }} questions dans le temps imparti.</p>
      </article>

      <article class="info-card">
        <span class="info-icon">03</span>
        <h3>Consultez</h3>
        <p>Découvrez votre score et la correction après la fin.</p>
      </article>
    </section>

    <section class="page-wrap notice">
      <div>
        <strong>Prêt à commencer ?</strong>
        <p>Installez-vous et assurez-vous de disposer de {{ quiz.duree_minutes }} minutes.</p>
      </div>
      <a routerLink="/identification" class="btn btn-white">
        Accéder au QCM →
      </a>
    </section>
  }
  `
})
export class HomeComponent implements OnInit {
  private api = inject(ApiService);

  quiz: Quiz | null = null;
  chargement = true;
  erreur = '';

  ngOnInit(): void {
    this.api.get<{ quiz: Quiz }>('/quiz/actif').subscribe({
      next: (data) => {
        this.quiz = data.quiz;
        this.chargement = false;
      },
      error: (err) => {
        this.erreur = err.error?.message || 'Impossible de charger le quiz.';
        this.chargement = false;
      }
    });
  }
}