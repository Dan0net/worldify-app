// api/API.ts
export class API {
  private apiUrl = import.meta.env.VITE_API_URL;
  
  async authenticateUser(email: string, password: string, isLogin: boolean = true): Promise<{ 
    id: string; 
    email: string;
    token: string;
  }> {
    try {
      const response = await fetch(isLogin ? `${this.apiUrl}/users/login` : `${this.apiUrl}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        // If the response status code is not in the 200-299 range
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Unknown error occurred during login.';
        throw new Error(`Login failed: ${errorMessage}`);
      }

      const data = await response.json();

      if (!data.user?.id || !data.user?.email || !data.token) {
        throw new Error('Invalid response from server: Missing userId or token.');
      }

      return { id: data.user.id, email: data.user.email, token: data.token };
    } catch (error) {
      // Handle network errors or other unexpected exceptions
      throw new Error(`Login error: ${(error as Error).message}`);
    }
  }

  async login(email: string, password: string): Promise<{ id: string; token: string }> {
    return this.authenticateUser(email, password, true);
  }

  async register(email: string, password: string): Promise<{ id: string; token: string }> {
    return this.authenticateUser(email, password, false);
  }

  async getChunk(x: number, y: number, z: number): Promise<Uint8Array> {
    // Fetch chunk data
    return new Uint8Array();
  }

  async getChunksInRange(
    x: number,
    y: number,
    z: number,
    range: number
  ): Promise<Map<string, Uint8Array>> {
    // Fetch multiple chunks
    return new Map();
  }

  async saveChunk(x: number, y: number, z: number, data: Uint8Array): Promise<void> {
    // Save chunk data
  }

  async getMaterialConfig(): Promise<any> {
    // Fetch material configuration
    return {};
  }

  async getMaterialTextures(): Promise<ArrayBuffer> {
    // Fetch texture array
    return new ArrayBuffer(0);
  }
}