import sharp from "sharp";
import { readFileSync } from "fs";

const svg = readFileSync("scripts/app-icon.svg");
await sharp(svg).resize(1024, 1024).png().toFile("scripts/app-icon.png");
console.log("app-icon.png generated");
