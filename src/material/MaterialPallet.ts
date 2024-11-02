// material/TerrainPallet.ts
  
  export class MatterialPallet {
    public static pallet;

    constructor() {
    }
 
    public static async getPallet() {
      if (!MatterialPallet.pallet) {
        const materialIndicesResponse = await fetch(
            `materials/pallet.json`
          );
          this.pallet = await materialIndicesResponse.json();
      }

      return this.pallet
    }
  }
  