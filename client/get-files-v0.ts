import { promisify } from "util";
import * as fs from "fs";
import path from "path";

const readDir = promisify(fs.readdir);
const fsStat = promisify(fs.stat);

export const getFiles = async function* (dirPath: string): AsyncGenerator<string> {
  const files = await readDir(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    if ((await fsStat(filePath)).isDirectory()) {
      yield* getFiles(filePath);
    } else {
      yield filePath;
    }
  }
}
