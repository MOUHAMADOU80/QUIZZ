import { Injectable } from '@angular/core';
import { Participant, Tentative } from '../models';

@Injectable({ providedIn: 'root' })
export class SessionService {
  setParticipant(p: Participant): void { sessionStorage.setItem('participant', JSON.stringify(p)); }
  getParticipant(): Participant | null {
    const raw = sessionStorage.getItem('participant');
    return raw ? JSON.parse(raw) as Participant : null;
  }
  setTentative(t: Tentative): void { sessionStorage.setItem('tentative', JSON.stringify(t)); }
  getTentative(): Tentative | null {
    const raw = sessionStorage.getItem('tentative');
    return raw ? JSON.parse(raw) as Tentative : null;
  }
  clearQuiz(): void {
    sessionStorage.removeItem('tentative');
    sessionStorage.removeItem('participant');
  }
}
