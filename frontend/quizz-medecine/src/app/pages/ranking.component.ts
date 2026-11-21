import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../services/api.service';

@Component({
  standalone: true,
  template: `
  <section class="page-wrap content-page">
    <span class="eyebrow">PERFORMANCES</span><h1>Classement public</h1>
    <p class="lead">Retrouvez les résultats publiés par l'administrateur.</p>
    @if (loading) { <p class="loading">Chargement du classement…</p> }
    @else if (!published) { <div class="empty-state"><div class="empty-icon">⌁</div><h2>Classement indisponible</h2><p>Le classement n'a pas encore été publié.</p></div> }
    @else {
      <div class="table-wrap"><table><thead><tr><th>Rang</th><th>Nom</th><th>Prénom</th><th>Cycle</th><th>Score</th></tr></thead>
      <tbody>@for (p of rows; track p.rang) { <tr><td>#{{p.rang}}</td><td>{{p.nom}}</td><td>{{p.prenom}}</td><td>{{p.cycle}}</td><td><b>{{p.score}}/50</b></td></tr> }</tbody></table></div>
    }
  </section>
  `
})
export class RankingComponent implements OnInit {
  private api = inject(ApiService); loading = true; published = false; rows: any[] = [];
  ngOnInit(): void {
  this.api.get<{
    publie: boolean;
    classement?: any[];
    message?: string;
  }>('/quiz/1/classement/public').subscribe({
    next: (reponse) => {
      this.published = reponse.publie;
      this.rows = reponse.classement || [];
      this.loading = false;
    },
    error: (erreur) => {
      console.error('Erreur de chargement du classement :', erreur);
      this.published = false;
      this.loading = false;
    }
  });
}
}
