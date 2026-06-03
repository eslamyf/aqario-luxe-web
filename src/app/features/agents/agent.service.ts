import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Agent {
  id?: string;
  name: string;
  initial?: string;
  title?: string;
  specialty?: string;
  regions?: string[];
  countries?: string[];
  sales?: number | string;
  volume?: string;
  value?: string;
  rating?: number;
}

interface ApiResponse<T> {
  status: string;
  results?: number;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class AgentService {
  private http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getAgents(): Observable<Agent[]> {
    return this.http
      .get<ApiResponse<{ agents: Agent[] }>>(`${this.base}/agents`)
      .pipe(map(res => res.data.agents));
  }
}
