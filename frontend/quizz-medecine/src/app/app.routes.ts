import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component';
import { IdentificationComponent } from './pages/identification.component';
import { QuizComponent } from './pages/quiz.component';
import { ResultComponent } from './pages/result.component';
import { RankingComponent } from './pages/ranking.component';
import { AdminLoginComponent } from './pages/admin-login.component';
import { AdminDashboardComponent } from './pages/admin-dashboard.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'identification', component: IdentificationComponent },
  { path: 'quiz', component: QuizComponent },
  { path: 'resultat/:tentativeId', component: ResultComponent },
  { path: 'classement', component: RankingComponent },
  { path: 'admin/connexion', component: AdminLoginComponent },
  { path: 'admin', component: AdminDashboardComponent },
  { path: '**', redirectTo: '' }
];
