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
    // L'endpoint public de classement sera raccordé lorsque sa route backend sera confirmée.
    this.loading = false;
  }
}
