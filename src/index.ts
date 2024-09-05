import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

interface Block {
  echoLine: string;
  content: string[];
}

async function processFile(
  inputFilePath: string,
  outputFilePath: string
): Promise<void> {
  const fileStream = fs.createReadStream(inputFilePath);
  const readLine = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const headerLines: string[] = [];
  const blockMap: Map<string, Block> = new Map();
  let inHeader = true; // Indicates whether we are still reading the header part of the file
  let currentBlock: Block | null = null;

  for await (const line of readLine) {
    if (inHeader) {
      headerLines.push(line); // Collect header lines
      if (line.includes("#pragma block_enter")) {
        inHeader = false; // Header ends when the first #pragma block_enter is found
      }
      continue;
    }

    if (line.startsWith('#pragma echo "Processing')) {
      // Start of a new block: Extract file path and check if it's unique
      const filePath = line.match(/"Processing (.*)"/)?.[1];
      if (filePath && !blockMap.has(filePath)) {
        currentBlock = {
          echoLine: line,
          content: [],
        };
        blockMap.set(filePath, currentBlock); // Store the block in the map
      } else {
        currentBlock = null; // Block is not unique, ignore it
      }
    } else if (line.startsWith("#pragma block_exit")) {
      // End of the current block
      if (currentBlock) {
        currentBlock.content.push(line); // Add the block exit line to the block's content
        currentBlock = null; // Reset currentBlock to indicate we're outside any block
      }
    } else {
      // Add content to the current block if we are inside one
      if (currentBlock) {
        currentBlock.content.push(line);
      }
    }
  }

  // Write the optimized output file
  const outputStream = fs.createWriteStream(outputFilePath);
  for (const line of headerLines) {
    outputStream.write(`${line}\n`); // Write the header lines first
  }

  // Write each unique block to the output file
  for (const [_, block] of blockMap) {
    outputStream.write(`${block.echoLine}\n`); // Write the #pragma echo line
    for (const contentLine of block.content) {
      outputStream.write(`${contentLine}\n`); // Write the content of the block
    }
  }

  // Close the output file
  outputStream.end();
  console.log(`Optimized file written to ${outputFilePath}`);
}

// Get arguments passed from the command line
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error("Please provide input and output file paths.");
  process.exit(1);
}

const inputFilePath = path.resolve(args[0]);
const outputFilePath = path.resolve(args[1]);

// Start processing the file
processFile(inputFilePath, outputFilePath).catch((err) => console.error(err));
