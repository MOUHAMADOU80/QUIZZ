
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

type AdminSection = 'accueil' | 'qcm' | 'participants' | 'classement';

interface OptionForm {
  id?: number;
  contenu: string;
  est_correcte: boolean;
}

interface Question {
  id: number;
  contenu: string;
  ordre: number;
  options: OptionForm[];
}

interface QuestionRow {
  question_id: number;
  question: string;
  ordre: number;
  option_id: number;
  proposition: string;
  est_correcte: boolean;
}

interface QuizInfo {
  id: number;
  titre: string;
  description: string;
  actif: boolean;
  duree_minutes: number;
  nombre_questions: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [FormsModule],

  template: `
    <div class="admin-layout">

      <aside class="sidebar">

        <div class="brand">
          <div class="logo">QM</div>
          <div>
            <strong>QUIZZ_MEDECINE</strong>
            <small>Administration</small>
          </div>
        </div>

        <p class="menu-label">MENU PRINCIPAL</p>

        <nav>
          <button
            [class.active]="section === 'accueil'"
            (click)="changerSection('accueil')">
            ⌂ Tableau de bord
          </button>

          <button
            [class.active]="section === 'qcm'"
            (click)="changerSection('qcm')">
            ▤ Gestion des QCM
          </button>

          <button
            [class.active]="section === 'participants'"
            (click)="changerSection('participants')">
            ♙ Participants
          </button>

          <button
            [class.active]="section === 'classement'"
            (click)="changerSection('classement')">
            ♛ Classement
          </button>
        </nav>

        <div class="sidebar-bottom">
          <div class="profile">
            <div class="avatar">A</div>
            <div>
              <strong>Administrateur</strong>
              <small>Compte admin</small>
            </div>
          </div>

          <button class="logout" (click)="logout()">
            ↪ Déconnexion
          </button>
        </div>

      </aside>

      <main class="main">

        <header class="header">
          <div>
            <span class="eyebrow">ESPACE ADMINISTRATEUR</span>
            <h1>{{ titreSection }}</h1>
            <p>Bienvenue dans votre espace de gestion.</p>
          </div>

          <span class="admin-badge">● Administration</span>
        </header>

        <!-- TABLEAU DE BORD -->

        @if (section === 'accueil') {

          <section>

            <div class="welcome">
              <span>VOTRE PLATEFORME</span>
              <h2>Gérez votre quiz en toute simplicité.</h2>
              <p>
                Gérez les questionnaires, les participants et les résultats.
              </p>
            </div>

            <div class="stats">

              <article>
                <span>Questions préparées</span>
                <strong>{{ questions.length }} / 50</strong>
              </article>

              <article>
                <span>Quiz</span>
                <strong>QUIZZ_MEDECINE</strong>
              </article>

              <article>
                <span>Durée prévue</span>
                <strong>30 minutes</strong>
              </article>

            </div>

            <!-- STATUT DU QCM -->

            <div class="quiz-status-card">

              <div class="quiz-status-heading">
                <div>
                  <h2>État du questionnaire</h2>
                  <p>Contrôlez la disponibilité de votre QCM.</p>
                </div>

                @if (chargementStatut) {
                  <span class="status-loading">
                    Chargement...
                  </span>
                } @else if (quizInfo) {
                  <span
                    [class.status-active]="quizInfo.actif"
                    [class.status-inactive]="!quizInfo.actif">

                    {{ quizInfo.actif ? '● Actif' : '● Inactif' }}

                  </span>
                }
              </div>

              @if (quizInfo) {

                <div class="quiz-status-info">

                  <div>
                    <span>Nom du questionnaire</span>
                    <strong>{{ quizInfo.titre }}</strong>
                  </div>

                  <div>
                    <span>Questions prévues</span>
                    <strong>{{ quizInfo.nombre_questions }} questions</strong>
                  </div>

                  <div>
                    <span>Durée</span>
                    <strong>{{ quizInfo.duree_minutes }} minutes</strong>
                  </div>

                </div>

                @if (!quizInfo.actif) {

                  <button
                    class="primary"
                    (click)="activerQuiz()"
                    [disabled]="chargementStatut">

                    Activer le QCM

                  </button>

                } @else {

                  <button
                    class="danger-button"
                    (click)="desactiverQuiz()"
                    [disabled]="chargementStatut">

                    Désactiver le QCM

                  </button>

                }

              } @else if (!chargementStatut) {

                <p class="status-error">
                  Impossible de récupérer les informations du QCM.
                </p>

                <button
                  class="secondary"
                  (click)="chargerStatutQuiz()">

                  Réessayer

                </button>

              }

              @if (messageStatut) {
                <p class="status-message">
                  {{ messageStatut }}
                </p>
              }

            </div>

            <button
              class="primary"
              (click)="changerSection('qcm')">

              Gérer les questions →

            </button>

          </section>
        }

        <!-- GESTION DES QUESTIONS -->

        @if (section === 'qcm') {

          <section class="qcm-section">

            <div class="qcm-heading">
              <div>
                <h2>Questions du questionnaire</h2>
                <p>
                  Ajoutez et gérez les 50 questions de votre QCM.
                </p>
              </div>

              <button
                class="primary"
                (click)="nouvelleQuestion()">

                + Ajouter une question

              </button>
            </div>

            <div class="progress-card">

              <div class="progress-info">
                <strong>Progression du QCM</strong>
                <span>{{ questions.length }} / 50 questions</span>
              </div>

              <div class="progress-track">
                <div
                  class="progress-bar"
                  [style.width.%]="(questions.length / 50) * 100">
                </div>
              </div>

              <small>
                {{ questions.length >= 50
                  ? 'Les 50 questions sont enregistrées.'
                  : 'Il reste ' + (50 - questions.length) + ' question(s) à ajouter.' }}
              </small>

            </div>

            @if (erreur) {
              <div class="error">{{ erreur }}</div>
            }

            @if (message) {
              <div class="success">{{ message }}</div>
            }

            @if (chargement) {
              <p class="loading">
                Chargement des questions...
              </p>
            }

            @if (!chargement && questions.length === 0) {

              <div class="empty">
                <div>▤</div>
                <h3>Aucune question enregistrée</h3>
                <p>
                  Commencez par ajouter la première question du QCM.
                </p>

                <button
                  class="primary"
                  (click)="nouvelleQuestion()">

                  Ajouter la première question

                </button>
              </div>

            }

            @if (!chargement && questions.length > 0) {

              <div class="question-list">

                @for (question of questions; track question.id) {

                  <article class="question-card">

                    <div class="question-top">

                      <span class="question-number">
                        Question {{ question.ordre }}
                      </span>

                      <div class="question-actions">

                        <button
                          class="edit"
                          (click)="modifier(question)">

                          Modifier

                        </button>

                        <button
                          class="delete"
                          (click)="supprimer(question)">

                          Supprimer

                        </button>

                      </div>

                    </div>

                    <h3>{{ question.contenu }}</h3>

                    <div class="options-list">

                      @for (option of question.options; track option.id) {

                        <div class="option-row">

                          <span>{{ option.contenu }}</span>

                          @if (option.est_correcte) {
                            <span class="correct">
                              Bonne réponse
                            </span>
                          }

                        </div>

                      }

                    </div>

                  </article>

                }

              </div>

            }

            <!-- FORMULAIRE QUESTION -->

            @if (formVisible) {

              <div class="form-overlay">

                <div class="question-form">

                  <div class="form-heading">

                    <div>
                      <h2>
                        {{ modeEdition
                          ? 'Modifier la question'
                          : 'Nouvelle question' }}
                      </h2>

                      <p>
                        Renseignez l'énoncé et les quatre propositions.
                      </p>
                    </div>

                    <button
                      class="close"
                      (click)="fermerFormulaire()">

                      ✕

                    </button>

                  </div>

                  <label>Énoncé de la question</label>

                  <textarea
                    [(ngModel)]="form.contenu"
                    placeholder="Saisissez votre question...">
                  </textarea>

                  <label class="options-title">
                    Les quatre propositions
                  </label>

                  @for (option of form.options; track $index) {

                    <div class="option-editor">

                      <input
                        type="text"
                        [(ngModel)]="option.contenu"
                        [placeholder]="'Proposition ' + ($index + 1)">

                      <label class="correct-check">

                        <input
                          type="checkbox"
                          [(ngModel)]="option.est_correcte">

                        Bonne réponse

                      </label>

                    </div>

                  }

                  <p class="form-hint">
                    Tu peux sélectionner plusieurs bonnes réponses.
                  </p>

                  @if (erreurFormulaire) {
                    <div class="error">
                      {{ erreurFormulaire }}
                    </div>
                  }

                  <div class="form-actions">

                    <button
                      class="secondary"
                      (click)="fermerFormulaire()">

                      Annuler

                    </button>

                    <button
                      class="primary"
                      [disabled]="enregistrement"
                      (click)="enregistrerQuestion()">

                      {{ enregistrement
                        ? 'Enregistrement...'
                        : (modeEdition
                          ? 'Enregistrer les modifications'
                          : 'Ajouter la question') }}

                    </button>

                  </div>

                </div>

              </div>

            }

          </section>
        }

        <!-- PARTICIPANTS -->

        @if (section === 'participants') {

          <div class="placeholder">
            <h2>Gestion des participants</h2>
            <p>
              Cette rubrique sera connectée à l'API des participants.
            </p>
          </div>

        }

        <!-- CLASSEMENT -->

        @if (section === 'classement') {

          <div class="placeholder">
            <h2>Gestion du classement</h2>
            <p>
              Cette rubrique permettra de contrôler la publication
              du classement public.
            </p>
          </div>

        }

      </main>

    </div>
  `,

  styles: [`

    :host {
      display: block;
      min-height: 100vh;
      background: #f5f7fb;
      color: #172033;
      font-family: Arial, sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    button {
      cursor: pointer;
      font: inherit;
    }

    .admin-layout {
      display: flex;
      min-height: 100vh;
    }

    /* SIDEBAR */

    .sidebar {
      width: 255px;
      flex-shrink: 0;
      background: #111c35;
      color: white;
      padding: 25px 17px;
      display: flex;
      flex-direction: column;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 0 7px 30px;
    }

    .logo {
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      border-radius: 11px;
      background: #4263eb;
      font-weight: bold;
    }

    .brand strong,
    .brand small,
    .profile strong,
    .profile small {
      display: block;
    }

    .brand strong {
      font-size: 13px;
    }

    .brand small,
    .profile small {
      color: #aab5cc;
      font-size: 11px;
      margin-top: 5px;
    }

    .menu-label {
      color: #8491ac;
      font-size: 10px;
      letter-spacing: 1.2px;
      padding: 8px;
    }

    nav {
      display: grid;
      gap: 7px;
    }

    nav button {
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: #bdc7da;
      text-align: left;
      padding: 13px 12px;
      font-size: 13px;
    }

    nav button.active,
    nav button:hover {
      background: #26385d;
      color: white;
    }

    .sidebar-bottom {
      margin-top: auto;
    }

    .profile {
      display: flex;
      gap: 10px;
      align-items: center;
      border-top: 1px solid #2a3853;
      padding: 15px 5px;
    }

    .avatar {
      width: 35px;
      height: 35px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: #4263eb;
    }

    .profile strong {
      font-size: 12px;
    }

    .logout {
      width: 100%;
      border: 0;
      background: transparent;
      color: #ffb4b4;
      text-align: left;
      padding: 12px;
    }

    /* CONTENU PRINCIPAL */

    .main {
      flex: 1;
      min-width: 0;
      padding: 35px 40px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 15px;
      margin-bottom: 30px;
    }

    .eyebrow {
      color: #4263eb;
      font-size: 10px;
      font-weight: bold;
      letter-spacing: 1.4px;
    }

    .header h1 {
      font-size: 27px;
      margin: 9px 0;
    }

    .header p,
    .qcm-heading p {
      color: #7a8498;
      font-size: 13px;
      margin: 0;
    }

    .admin-badge {
      background: white;
      border: 1px solid #e7eaf1;
      padding: 10px 13px;
      border-radius: 25px;
      font-size: 11px;
      color: #4263eb;
      white-space: nowrap;
    }

    /* ACCUEIL */

    .welcome {
      padding: 28px;
      color: white;
      border-radius: 15px;
      background: linear-gradient(115deg, #263e83, #4263eb);
    }

    .welcome span {
      font-size: 10px;
      letter-spacing: 1.3px;
    }

    .welcome h2 {
      font-size: 23px;
      margin: 12px 0;
    }

    .welcome p {
      font-size: 13px;
      color: #e0e7ff;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 15px;
      margin: 22px 0;
    }

    .stats article,
    .progress-card,
    .question-card,
    .placeholder {
      background: white;
      border: 1px solid #e9edf4;
      border-radius: 12px;
      padding: 20px;
    }

    .stats span,
    .stats strong {
      display: block;
    }

    .stats span {
      font-size: 12px;
      color: #7a8498;
    }

    .stats strong {
      font-size: 20px;
      margin-top: 12px;
    }

    /* BOUTONS */

    .primary {
      border: 0;
      border-radius: 8px;
      background: #4263eb;
      color: white;
      padding: 11px 16px;
      font-size: 12px;
      font-weight: bold;
    }

    .primary:hover {
      background: #304fc9;
    }

    .primary:disabled,
    .danger-button:disabled {
      opacity: .6;
      cursor: not-allowed;
    }

    .secondary {
      border: 1px solid #dce1ea;
      background: white;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 12px;
    }

    .danger-button {
      border: 0;
      border-radius: 8px;
      background: #d94b4b;
      color: white;
      padding: 11px 16px;
      font-size: 12px;
      font-weight: bold;
    }

    .danger-button:hover {
      background: #bb3737;
    }

    /* STATUT DU QCM */

    .quiz-status-card {
      background: white;
      border: 1px solid #e9edf4;
      border-radius: 12px;
      padding: 22px;
      margin-bottom: 22px;
    }

    .quiz-status-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 22px;
    }

    .quiz-status-heading h2 {
      font-size: 17px;
      margin: 0 0 7px;
    }

    .quiz-status-heading p {
      font-size: 12px;
      color: #7a8498;
      margin: 0;
    }

    .status-active,
    .status-inactive,
    .status-loading {
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: bold;
      white-space: nowrap;
    }

    .status-active {
      color: #168451;
      background: #eaf8f0;
    }

    .status-inactive {
      color: #c04a4a;
      background: #fff0f0;
    }

    .status-loading {
      color: #4263eb;
      background: #edf2ff;
    }

    .quiz-status-info {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }

    .quiz-status-info span,
    .quiz-status-info strong {
      display: block;
    }

    .quiz-status-info span {
      color: #7a8498;
      font-size: 11px;
      margin-bottom: 8px;
    }

    .quiz-status-info strong {
      font-size: 14px;
    }

    .status-message,
    .status-error {
      font-size: 12px;
      margin-top: 12px;
    }

    .status-message {
      color: #4263eb;
    }

    .status-error {
      color: #b52c2c;
    }

    /* GESTION DES QUESTIONS */

    .qcm-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 15px;
      margin-bottom: 20px;
    }

    .qcm-heading h2 {
      font-size: 19px;
      margin: 0 0 8px;
    }

    .progress-card {
      margin-bottom: 20px;
    }

    .progress-info {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      font-size: 12px;
      margin-bottom: 12px;
    }

    .progress-track {
      height: 9px;
      background: #edf0f6;
      border-radius: 20px;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      background: #4263eb;
      transition: width .2s;
    }

    .progress-card small {
      display: block;
      color: #7a8498;
      font-size: 11px;
      margin-top: 10px;
    }

    .question-list {
      display: grid;
      gap: 14px;
    }

    .question-card {
      padding: 19px;
    }

    .question-top {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: center;
    }

    .question-number {
      color: #4263eb;
      font-size: 11px;
      font-weight: bold;
    }

    .question-card h3 {
      font-size: 14px;
      line-height: 1.5;
      margin: 15px 0;
    }

    .question-actions {
      display: flex;
      gap: 7px;
    }

    .question-actions button {
      border: 0;
      border-radius: 6px;
      padding: 7px 10px;
      font-size: 11px;
    }

    .edit {
      background: #edf2ff;
      color: #3657d6;
    }

    .delete {
      background: #fff0f0;
      color: #d34c4c;
    }

    .options-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .option-row {
      background: #f7f8fb;
      padding: 10px;
      border-radius: 7px;
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 12px;
    }

    .correct {
      color: #168451;
      font-size: 10px;
      font-weight: bold;
      white-space: nowrap;
    }

    /* ÉTATS VIDES ET MESSAGES */

    .empty,
    .placeholder {
      background: white;
      border: 1px solid #e9edf4;
      border-radius: 13px;
      padding: 40px 20px;
      text-align: center;
    }

    .empty > div {
      font-size: 35px;
      color: #4263eb;
    }

    .empty h3 {
      font-size: 17px;
    }

    .empty p,
    .placeholder p {
      color: #7a8498;
      font-size: 12px;
      margin-bottom: 20px;
    }

    .loading {
      color: #7a8498;
      font-size: 13px;
    }

    .error,
    .success {
      border-radius: 8px;
      padding: 12px;
      font-size: 12px;
      margin: 12px 0;
    }

    .error {
      background: #fff0f0;
      color: #b52c2c;
    }

    .success {
      background: #eaf8f0;
      color: #167548;
    }

    /* FORMULAIRE */

    .form-overlay {
      position: fixed;
      inset: 0;
      z-index: 10;
      background: #10182899;
      display: grid;
      place-items: center;
      padding: 18px;
      overflow-y: auto;
    }

    .question-form {
      width: min(620px, 100%);
      max-height: 95vh;
      overflow-y: auto;
      background: white;
      border-radius: 14px;
      padding: 25px;
    }

    .form-heading {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 22px;
    }

    .form-heading h2 {
      font-size: 19px;
      margin: 0 0 7px;
    }

    .form-heading p {
      font-size: 12px;
      color: #7a8498;
      margin: 0;
    }

    .close {
      border: 0;
      background: #f1f3f7;
      border-radius: 7px;
      width: 32px;
      height: 32px;
    }

    .question-form > label {
      display: block;
      font-size: 12px;
      font-weight: bold;
      margin: 15px 0 8px;
    }

    textarea,
    .option-editor > input {
      width: 100%;
      border: 1px solid #dce1ea;
      border-radius: 7px;
      padding: 11px;
      font: inherit;
      font-size: 12px;
      outline: none;
    }

    textarea {
      min-height: 85px;
      resize: vertical;
    }

    textarea:focus,
    .option-editor > input:focus {
      border-color: #4263eb;
    }

    .option-editor {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 9px 0;
    }

    .option-editor > input {
      flex: 1;
      min-width: 0;
    }

    .correct-check {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      white-space: nowrap;
      color: #168451;
    }

    .form-hint {
      color: #7a8498;
      font-size: 11px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }

    /* RESPONSIVE */

    @media(max-width: 850px) {
      .main {
        padding: 25px 20px;
      }

      .stats {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media(max-width: 600px) {

      .admin-layout {
        flex-direction: column;
      }

      .sidebar {
        width: 100%;
        padding: 14px;
      }

      .brand {
        padding-bottom: 13px;
      }

      .menu-label,
      .sidebar-bottom {
        display: none;
      }

      nav {
        display: flex;
        overflow-x: auto;
      }

      nav button {
        flex-shrink: 0;
        white-space: nowrap;
        font-size: 11px;
        padding: 10px;
      }

      .main {
        padding: 22px 14px;
      }

      .header {
        align-items: flex-start;
        flex-direction: column;
      }

      .header h1 {
        font-size: 23px;
      }

      .stats {
        grid-template-columns: 1fr;
      }

      .qcm-heading {
        align-items: flex-start;
        flex-direction: column;
      }

      .options-list {
        grid-template-columns: 1fr;
      }

      .question-top {
        align-items: flex-start;
        flex-direction: column;
      }

      .option-editor {
        align-items: flex-start;
        flex-direction: column;
      }

      .option-editor > input {
        width: 100%;
      }

      .question-form {
        padding: 18px;
      }

      .quiz-status-info {
        grid-template-columns: 1fr;
      }

      .quiz-status-heading {
        align-items: flex-start;
        flex-direction: column;
      }
    }

  `]
})

export class AdminDashboardComponent {

  private readonly quizId = 1;

  quizInfo: QuizInfo | null = null;
  chargementStatut = false;
  messageStatut = '';

  section: AdminSection = 'accueil';

  questions: Question[] = [];

  chargement = false;
  enregistrement = false;

  formVisible = false;
  modeEdition = false;

  erreur = '';
  message = '';
  erreurFormulaire = '';

  questionEnCoursId: number | null = null;

  form = this.formulaireVide();

  constructor(private api: ApiService) {
    this.chargerStatutQuiz();
    this.chargerQuestions();
  }

  get titreSection(): string {

    const titres: Record<AdminSection, string> = {
      accueil: 'Tableau de bord',
      qcm: 'Gestion des QCM',
      participants: 'Participants',
      classement: 'Classement'
    };

    return titres[this.section];
  }

  changerSection(section: AdminSection): void {

    this.section = section;

    this.message = '';
    this.erreur = '';

    if (section === 'qcm') {
      this.chargerQuestions();
    }
  }

  formulaireVide(): {
    contenu: string;
    options: OptionForm[];
  } {

    return {
      contenu: '',
      options: Array.from({ length: 4 }, () => ({
        contenu: '',
        est_correcte: false
      }))
    };
  }

  /* CHARGEMENT DES QUESTIONS */

  chargerQuestions(): void {

    this.chargement = true;
    this.erreur = '';

    this.api.get<{ questions: QuestionRow[] }>(
      `/questions/${this.quizId}`
    ).subscribe({

      next: (reponse) => {

        const groupes = new Map<number, Question>();

        for (const ligne of reponse.questions) {

          if (!groupes.has(ligne.question_id)) {

            groupes.set(ligne.question_id, {
              id: ligne.question_id,
              contenu: ligne.question,
              ordre: ligne.ordre,
              options: []
            });

          }

          const question = groupes.get(ligne.question_id)!;

          question.options.push({
            id: ligne.option_id,
            contenu: ligne.proposition,
            est_correcte: ligne.est_correcte
          });

        }

        this.questions = Array.from(groupes.values())
          .sort((a, b) => a.ordre - b.ordre);

        this.chargement = false;

      },

      error: (err) => {

        this.chargement = false;

        this.erreur = err.error?.message ||
          'Impossible de charger les questions.';

      }

    });
  }

  /* AJOUTER UNE QUESTION */

  nouvelleQuestion(): void {

    if (this.questions.length >= 50) {

      this.erreur = 'Le QCM contient déjà 50 questions.';
      return;

    }

    this.modeEdition = false;
    this.questionEnCoursId = null;

    this.form = this.formulaireVide();

    this.erreurFormulaire = '';
    this.formVisible = true;

  }

  /* MODIFIER UNE QUESTION */

  modifier(question: Question): void {

    this.modeEdition = true;
    this.questionEnCoursId = question.id;

    this.erreurFormulaire = '';

    this.form = {
      contenu: question.contenu,
      options: question.options.map(option => ({ ...option }))
    };

    this.formVisible = true;

  }

  fermerFormulaire(): void {

    this.formVisible = false;
    this.erreurFormulaire = '';

  }

  /* ENREGISTRER UNE QUESTION */

  enregistrerQuestion(): void {

    this.erreurFormulaire = '';

    if (!this.form.contenu.trim()) {

      this.erreurFormulaire =
        'Veuillez saisir l’énoncé de la question.';

      return;
    }

    if (
      this.form.options.length !== 4 ||
      this.form.options.some(option => !option.contenu.trim())
    ) {

      this.erreurFormulaire =
        'Veuillez remplir les quatre propositions.';

      return;
    }

    if (!this.form.options.some(option => option.est_correcte)) {

      this.erreurFormulaire =
        'Sélectionnez au moins une bonne réponse.';

      return;
    }

    const donnees = {

      contenu: this.form.contenu.trim(),

      options: this.form.options.map(option => ({

        ...(this.modeEdition ? { id: option.id } : {}),

        contenu: option.contenu.trim(),

        est_correcte: option.est_correcte

      }))

    };

    this.enregistrement = true;

    const requete = this.modeEdition &&
      this.questionEnCoursId !== null

      ? this.api.put(
          `/questions/${this.questionEnCoursId}`,
          donnees
        )

      : this.api.post(
          `/questions/${this.quizId}`,
          donnees
        );

    requete.subscribe({

      next: (reponse: any) => {

        this.enregistrement = false;
        this.formVisible = false;

        this.message = reponse.message ||
          'Question enregistrée avec succès.';

        this.chargerQuestions();

      },

      error: (err) => {

        this.enregistrement = false;

        this.erreurFormulaire = err.error?.message ||
          'Une erreur est survenue pendant l’enregistrement.';

      }

    });

  }

  /* SUPPRIMER UNE QUESTION */

  supprimer(question: Question): void {

    const confirmation = confirm(
      `Voulez-vous vraiment supprimer la question ${question.ordre} ?`
    );

    if (!confirmation) return;

    this.api.delete(`/questions/${question.id}`).subscribe({

      next: (reponse: any) => {

        this.message = reponse.message || 'Question supprimée.';

        this.erreur = '';

        this.chargerQuestions();

      },

      error: (err) => {

        this.erreur = err.error?.message ||
          'Impossible de supprimer cette question.';

      }

    });

  }

  /* RÉCUPÉRER LE STATUT DU QCM */

  chargerStatutQuiz(): void {

    this.chargementStatut = true;
    this.messageStatut = '';

    this.api.get<{ quiz: QuizInfo }>(
      `/quiz/${this.quizId}`
    ).subscribe({

      next: (reponse) => {

        this.quizInfo = reponse.quiz;

        this.chargementStatut = false;

      },

      error: (erreur) => {

        this.quizInfo = null;

        this.messageStatut = erreur.error?.message ||
          'Impossible de récupérer le statut du QCM.';

        this.chargementStatut = false;

      }

    });

  }

  /* ACTIVER LE QCM */

  activerQuiz(): void {

    if (this.chargementStatut) return;

    this.chargementStatut = true;
    this.messageStatut = '';

    this.api.patch(
      `/quiz/${this.quizId}/activer`
    ).subscribe({

      next: (reponse: any) => {

        this.messageStatut = reponse.message ||
          'Le QCM a été activé avec succès.';

        this.chargerStatutQuiz();

      },

      error: (erreur) => {

        this.messageStatut = erreur.error?.message ||
          'Impossible d’activer le QCM.';

        this.chargementStatut = false;

      }

    });

  }

  /* DÉSACTIVER LE QCM */

  desactiverQuiz(): void {

    if (this.chargementStatut) return;

    const confirmation = confirm(
      'Voulez-vous vraiment désactiver ce QCM ? ' +
      'Les tentatives en cours seront interrompues.'
    );

    if (!confirmation) return;

    this.chargementStatut = true;
    this.messageStatut = '';

    this.api.patch(
      `/quiz/${this.quizId}/desactiver`
    ).subscribe({

      next: (reponse: any) => {

        this.messageStatut = reponse.message ||
          'Le QCM a été désactivé avec succès.';

        this.chargerStatutQuiz();

      },

      error: (erreur) => {

        this.messageStatut = erreur.error?.message ||
          'Impossible de désactiver le QCM.';

        this.chargementStatut = false;

      }

    });

  }

  /* DÉCONNEXION */

  logout(): void {

    sessionStorage.removeItem('adminToken');

    location.href = '/admin/connexion';

  }

}
