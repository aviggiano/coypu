import fs from 'fs';
import analyze from './analyze';
import compileAndBuildAST from './compile';
import issues from './issues';
import { InputType, IssueTypes } from './types';
import { installDependencies as install } from './utils';

interface Params {
  scope: string;
  output?: string;
  installDependencies?: boolean;
  verbose?: boolean;
}
const main = async ({ scope, output = 'report.md', installDependencies, verbose }: Params) => {
  let result = '# Report\n\n';
  let fileNames: string[] = [];

  // Scope is specified in a file or is passed in a string
  const content = fs.readFileSync(scope as string, { encoding: 'utf8', flag: 'r' });
  for (const word of [...content.matchAll(/[a-zA-Z\/\.\-\_0-9]+/g)].map(r => r[0])) {
    console.log(word);
    if (word.endsWith('.sol') && fs.existsSync(word)) {
      fileNames.push(word);
    }
  }
  if (fileNames.length === 0) throw Error('Scope is empty');
  fileNames = [...new Set(fileNames)];

  console.log('Scope: ', fileNames);

  if (verbose) {
    result += '## Files analyzed\n\n';
    fileNames.forEach(fileName => {
      result += ` - ${fileName}\n`;
    });
  }

  // Install dependencies
  if (installDependencies) {
    await install();
  }

  // Read file contents and build AST
  const files: InputType = [];
  const asts = await compileAndBuildAST('.', fileNames);
  fileNames.forEach((fileName, index) => {
    files.push({
      content: fs.readFileSync(`${fileName}`, { encoding: 'utf8', flag: 'r' }),
      name: fileName,
      ast: asts[index],
    });
  });

  const analysis = Object.values(IssueTypes).map(type =>
    analyze(
      files,
      issues.filter(i => i.type === type),
    ),
  );

  result += '## Summary \n\n';
  result += '\n| |Issue|Instances|\n|-|:-|:-:|\n';
  for (const a of analysis) {
    result += a.summary;
  }
  result += '## Issues \n\n';
  for (const a of analysis) {
    result += a.result;
  }

  fs.writeFileSync(output, result);
};

export default main;
