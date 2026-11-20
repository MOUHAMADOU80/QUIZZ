export interface Participant {
  id: number;
  nom: string;
  prenom: string;
  cycle: 'Licence' | 'Master' | 'Docteur';
}
export interface OptionQcm {
  id: number;
  contenu: string;
  est_correcte?: boolean;
  selectionnee?: boolean;
}
export interface Question {
  id: number;
  contenu: string;
  ordre: number;
  options: OptionQcm[];
}
export interface Tentative {
  id: number;
  score?: number;
  statut?: string;
  date_debut?: string;
  temps_restant?: number;
}
