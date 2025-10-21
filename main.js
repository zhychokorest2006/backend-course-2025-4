import { Command } from 'commander';
import http from 'http';
import fs from 'fs/promises';
import { XMLBuilder } from 'fast-xml-parser';

const program = new Command();

program
  .requiredOption('-i, --input <path>', 'Шлях до файлу')
  .requiredOption('-h, --host <host>', 'Хост сервера')
  .requiredOption('-p, --port <port>', 'Порт сервера');

program.parse(process.argv);

const options = program.opts();

const host = options.host;
const port = options.port;
const inputFile = options.input;

try {
  await fs.access(inputFile);
} catch {
  console.error('Cannot find input file');
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${host}:${port}`);
    const data = JSON.parse(await fs.readFile(inputFile, 'utf-8'));

    let filtered = data;

    // Фільтрація для варіанту iris
    const minPetal = parseFloat(url.searchParams.get('min_petal_length'));
    if (!isNaN(minPetal)) {
      filtered = filtered.filter(f => f["petal.length"] > minPetal);
    }

    const includeVariety = url.searchParams.get('variety') === 'true';
    const output = filtered.map(flower => ({
      petal_length: flower["petal.length"],
      petal_width: flower["petal.width"],
      ...(includeVariety && { variety: flower.variety })
    }));

    const builder = new XMLBuilder({ ignoreAttributes: false, format: true });
    const xml = builder.build({ irises: { flower: output } });

    res.writeHead(200, { 'Content-Type': 'application/xml' });
    res.end(xml);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server error: ' + err.message);
  }
});

server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}/`);
});
