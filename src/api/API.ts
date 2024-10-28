import { ChunkData, UserData } from "../utils/interfaces";
import { useSessionStore } from "../store/SessionStore";

// api/API.ts
export class API {
  private apiUrl = import.meta.env.VITE_API_URL;

  async fetchJsonHandler(uri, body: any = null, auth = true) {
    const request = {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (auth) {
      const { jwtToken } = useSessionStore.getState();
      request.headers["Authorization"] = `Bearer ${jwtToken}`;
    }

    if (body) {
      request["body"] = JSON.stringify(body);
    }

    try {
      const response = await fetch(uri, request);

      if (!response.ok) {
        // If the response status code is not in the 200-299 range
        const errorData = await response.json();
        const errorMessage =
          errorData.error || "Unknown error occurred during login.";
        throw new Error(`Request failed: ${errorMessage}`);
      }

      const data = await response.json();

      return data;
    } catch (error) {
      // Handle network errors or other unexpected exceptions
      throw new Error(`Request error: ${(error as Error).message}`);
    }
  }

  async authenticateUser(
    email: string,
    password: string,
    isLogin: boolean = true
  ): Promise<UserData> {
    //todo plaintext password?!?!

    const data = await this.fetchJsonHandler(
      isLogin ? `${this.apiUrl}/users/login` : `${this.apiUrl}/users/register`,
      { email, password },
      false
    );

    // if (!data.user?.id || !data.user?.email || !data.token) {
    //   throw new Error('Invalid response from server: Missing userId or token.');
    // }

    return data;
  }

  async login(email: string, password: string): Promise<UserData> {
    return this.authenticateUser(email, password, true);
  }

  async register(email: string, password: string): Promise<UserData> {
    return this.authenticateUser(email, password, false);
  }

  async getChunk(chunkCoord): Promise<ChunkData> {
    return this.fetchJsonHandler(
      `${this.apiUrl}/chunks/${chunkCoord.x}/${chunkCoord.y}/${chunkCoord.z}`
    );
  }
}
