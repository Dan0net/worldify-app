// api/Session.ts

import { useSessionStore } from "../store/SessionStore";
import { API } from "./API";

export class Session {
  constructor(private api: API) {
    this.initializeSession();
  }

  private async initializeSession() {
    const { jwtToken } = useSessionStore.getState();
    if (jwtToken) {
      // Validate token or refresh session
    }
  }

  async login(username: string, password: string) {
    const token = await this.api.login(username, password);
    useSessionStore.setState({ jwtToken: token });
  }

  async register(username: string, password: string) {
    const token = await this.api.register(username, password);
    useSessionStore.setState({ jwtToken: token });
  }
}