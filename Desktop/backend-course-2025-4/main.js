import { Command } from "commander";
import http from "http";
import fs from "fs";
import { XMLBuilder } from "fast-xml-parser";

const program = new Command();

program
  .requiredOption("-i, --input <path>", "Path to input JSON file")
  .requiredOption("-h, --host <host>", "Server host")
  .requiredOption("-p, --port <port>", "Server port");

program.parse(process.argv);
const options = program.opts();

function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.log("Cannot find input file");
    process.exit(1);
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${options.host}:${options.port}`);
  const varietyParam = url.searchParams.get("variety");
  const minPetal = parseFloat(url.searchParams.get("min_petal_length"));

  const jsonData = readJsonFile(options.input);

  // фільтрація під твій JSON
  let filtered = jsonData;
  if (!isNaN(minPetal)) {
    filtered = jsonData.filter((flower) => flower["petal.length"] > minPetal);
  }

  const result = filtered.map((flower) => {
    let item = {
      petal_length: flower["petal.length"],
      petal_width: flower["petal.width"],
    };
    if (varietyParam) {
      item.variety = flower.variety;
    }
    return item;
  });

  const builder = new XMLBuilder({ format: true });
  const xmlData = builder.build({ irises: { flower: result } });

  res.writeHead(200, { "Content-Type": "application/xml" });
  res.end(xmlData);
});

server.listen(options.port, options.host, () => {
  console.log(`Server running on http://${options.host}:${options.port}`);
});