
import sharp from "sharp";
import config from "./config.json" assert { type: "json" };
import path from "path";
import fs from "fs";

import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const imagePath = "./materials";
const outputPath = "../public/materials";

const mapChannels = {
  albedo: "rgba",
  normal: "rgba",
  ao: "r",
  roughness: "r",
  // metallic: [],
};

async function createDataArrayTextures() {
  const texturesConfig = config.materials;
  const textureSize = config.textureSize || 512;

  // Initialize data structures for each map type
  const maps = {
    albedo: [],
    normal: [],
    ao: [],
    roughness: [],
    // metallic: [],
  };

  const materialIndices = {}; // Keep track of material indices
  let materialIndex = 0;

  for (const materialName in texturesConfig) {
    const material = texturesConfig[materialName];
    materialIndices[materialName] = materialIndex++;

    for (const mapType in material) {
      const mapConfig = material[mapType];
      const mapPath = path.resolve(__dirname, imagePath, mapConfig.path);
      console.log(materialIndices, mapType);

      // Resize and process the image
      const image = await sharp(mapPath)
        .resize(textureSize, textureSize)
        // .ensureAlpha() // Ensure images have 4 channels (RGBA)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { data, info } = image;
      const { width, height, channels } = info;
      console.log(width, height, channels);

      const dataExtracted = extractChannels(
        data,
        width,
        height,
        channels,
        mapChannels[mapType]
      );

      maps[mapType].push({
        data: dataExtracted,
        width,
        height,
        channels: mapChannels[mapType],
      });
      // maps[mapType].push({ data, width, height, channels: mapChannels[mapType] });

      // // Extract channels if necessary
      // if (typeof mapConfig.channels === "string") {
      //   // For maps using all channels (e.g., "rgb")
      //   maps[mapType].push({ data, width, height, channels });
      // } else if (typeof mapConfig.channels === "object") {
      //   // For combined maps (e.g., aoRoughnessMetallic)
      //   const extractedMaps = extractChannels(
      //     data,
      //     width,
      //     height,
      //     channels,
      //     mapConfig.channels
      //   );
      //   for (const [mapName, mapData] of Object.entries(extractedMaps)) {
      //     maps[mapName].push({ data: mapData, width, height, channels: 1 });
      //   }
      // }
    }
  }

  const materialDefinitions = {
    materials: Object.keys(config.materials),
    maps: {},
    indicies: materialIndices,
  };

  // For each map type, combine the images into a single buffer
  for (const mapType in maps) {
    if (maps[mapType].length === 0) continue;

    const { combinedData, width, height, layers } = combineImages(
      maps[mapType]
    );

    // Write the binary file
    const outputDir = path.join(__dirname, outputPath);
    fs.writeFileSync(path.join(outputDir, `${mapType}.bin`), combinedData);

    // Write the metadata file
    const metadata = {
      width,
      height,
      channels: maps[mapType][0].channels,
      layers,
    };

    materialDefinitions["maps"][mapType] = metadata;
  }

  // Write material indices mapping
  fs.writeFileSync(
    path.join(__dirname, outputPath, "pallet.json"),
    JSON.stringify(materialDefinitions)
  );
}

// Function to extract specific channels from the image data
function extractChannels(data, width, height, channels, channelMapping) {
  const channelSize = width * height;

  const extractedData = Buffer.alloc(channelSize * channelMapping.length);

  // Map channel letters to indices
  const channelIndices = { r: 0, g: 1, b: 2, a: 3 };

  let channelWriteIndex = 0;
  for (const [mapName, channelLetter] of Object.entries(channelMapping)) {
    const channelReadIndex = channelIndices[channelLetter.toLowerCase()];
    console.log(mapName, channelWriteIndex, channelReadIndex, channelLetter);
    for (let i = 0; i < channelSize; i++) {
      extractedData[i * channelMapping.length + channelWriteIndex] =
        data[i * channels + channelReadIndex];
    }
    channelWriteIndex++;
  }

  return extractedData;
}

// Function to combine images into a single buffer
function combineImages(images) {
  const width = images[0].width;
  const height = images[0].height;
  const channels = images[0].channels;
  const layers = images.length;
  const layerSize = width * height * channels.length;
  const totalSize = layerSize * layers;
  console.log(width, height, channels, layers, totalSize);
  const combinedData = Buffer.alloc(totalSize);

  images.forEach((image, index) => {
    // console.log(image.data);
    image.data.copy(combinedData, index * layerSize);
  });

  return { combinedData, width, height, channels, layers };
}

createDataArrayTextures()
  .then(() => {
    console.log("DataArrayTextures created successfully");
  })
  .catch((err) => {
    console.error("Error creating DataArrayTextures:", err);
  });
