import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import { currentPkg, partialPkg } from '../test-data/pkg';
import * as transform from './transform';
import * as helpers from '../utils/helpers';

const { transformFilename, merge, concat, diffFiles, diffAndWriteFiles } = transform;

describe('transform', () => {
  describe('transformFilename', () => {
    it('should replace placeholder filename with appropriate key', () => {
      const fileName = '{{appName}}.config';
      const answers = {
        force: true,
        silent: true,
        appPrefix: true,
        appName: 'test',
        destination: '.\\test-data\\test',
        fetchWith: 'GraphQL',
        prerender: 'SSG',
        hostName: 'https://cm.jss.localhost',
        templates: [],
      };

      const transformedFileName = transformFilename(fileName, answers);

      expect(transformedFileName).to.equal('test.config');
    });
  });

  describe('merge', () => {
    it('should merge the contents of a partial package.json with the target package.json', () => {
      const expected = {
        name: 'test',
        version: '2.0.0',
        description: 'Updated package.json',
        scripts: {
          start:
            'cross-env-shell JSS_MODE=disconnected "npm-run-all --serial bootstrap --parallel next:dev start:disconnected-proxy start:watch-components"',
          test: 'tests are good',
        },
        config: {
          rootPlaceholders: ['jss-main', 'jss-test'],
        },
        files: ['dist'],
        dependencies: {
          bootstrap: '^4.3.1',
          chalk: '^4.1.2',
          nprogress: '~0.2.0',
        },
        devDependencies: {
          '@sitecore-jss/sitecore-jss-dev-tools': '^20.0.0-canary',
          '@types/node': '^16.11.7',
          typescript: '~4.3.5',
        },
        foo: {
          bar: [4, 5, 6, 1, 2, 3],
          x: {
            y: {
              bar: [1, 2, 3, 7, 8, 9],
              x: '20',
              y: 15,
              z: ['1', '2', '3', '9', '10', '11'],
            },
          },
        },
      };

      const result = merge(currentPkg, partialPkg);

      expect(result).to.deep.equal(expected);
    });
  });

  describe('concat', () => {
    it('should combine content', () => {
      const target = `VAL1=ONE
                      VAL2=TWO`;
      const source = `VAL3=three
                      # Comment
                      VAL4=four`;

      const result = concat(target, source);

      expect(result).to.contain(`VAL1=ONE
                      VAL2=TWO`);
      expect(result).to.contain(`VAL3=three
                      # Comment
                      VAL4=four`);
    });

    it('should join with crlf', () => {
      const target = 'foo';
      const source = 'bar';

      const result = concat(target, source);

      expect(result).to.equal('foo\r\nbar');
    });
  });

  describe('diffFiles', () => {
    let log: SinonStub;
    let prompt: SinonStub;

    afterEach(() => {
      log?.restore();
      prompt?.restore();
    });

    it('should return empty string when target file is not found', async () => {
      const result = await diffFiles('test', 'not/existing/path');

      expect(result).to.equal('');
    });

    it('should return empty string when source and target files are equal', async () => {
      const source = fs.readFileSync(
        path.resolve('src', 'common', 'test-data', 'transform', 'source.ts'),
        'utf-8'
      );
      const result = await diffFiles(
        source,
        path.resolve('src', 'common', 'test-data', 'transform', 'source.ts')
      );

      expect(result).to.equal('');
    });

    it('should show diff using text regular file', async () => {
      log = sinon.stub(console, 'log');
      prompt = sinon.stub(inquirer, 'prompt').returns({ choice: true } as any);
      const targetFilePath = path.resolve('src', 'common', 'test-data', 'transform', 'target.ts');

      const source = fs.readFileSync(
        path.resolve('src', 'common', 'test-data', 'transform', 'source.ts'),
        'utf-8'
      );
      const result = await diffFiles(source, targetFilePath);
      expect(log.getCalls().length).to.equal(12);

      const calls = [
        chalk.grey('= '),
        chalk.red('- const x = 15;'),
        chalk.green('+ const a = 10;'),
        chalk.grey('= const b = 20;'),
        chalk.grey('= '),
        chalk.grey('= console.log(10 + 20);'),
        chalk.grey('= '),
        chalk.red('- console.log(40 + 10);'),
        chalk.green('+ console.log(20 + 30);'),
        chalk.grey('= '),
        chalk.grey('= console.log(a + b);'),
      ];

      calls.forEach((arg, i) => {
        expect(log.getCall(i).args[0].replace('\r', '')).to.equal(arg);
      });

      expect(log.getCall(calls.length).args[0]).to.equal(
        `Showing potential changes in ${chalk.yellow(targetFilePath.replace('/', '\\'))}`
      );

      expect(
        prompt.calledOnceWith({
          type: 'list',
          name: 'choice',
          choices: ['yes', 'skip', 'yes to all', 'abort'],
          message: `File ${chalk.yellow(
            targetFilePath.replace('/', '\\')
          )} is about to be overwritten with the above changes. Are you sure you want to continue?`,
        })
      ).to.equal(true);

      expect(result).equal(true);
    });

    it('should show diff using json file', async () => {
      log = sinon.stub(console, 'log');
      prompt = sinon.stub(inquirer, 'prompt').returns({ choice: true } as any);
      const targetFilePath = path.resolve('src', 'common', 'test-data', 'transform', 'target.json');

      const source = fs.readFileSync(
        path.resolve('src', 'common', 'test-data', 'transform', 'source.json'),
        'utf-8'
      );
      const result = await diffFiles(source, targetFilePath);

      expect(log.getCalls().length).to.equal(16);

      const calls = [
        chalk.grey('= {'),
        chalk.red('-   "a": ['),
        chalk.red('-     1,'),
        chalk.red('-     2'),
        chalk.red('-   ],'),
        chalk.grey('=   "foo": {'),
        chalk.red('-     "b": 50,'),
        chalk.red('-     "bar": true,'),
        chalk.green('+     "bar": false,'),
        chalk.grey('=     "y": 15'),
        chalk.grey('=   },'),
        chalk.grey('=   "x": 10,'),
        chalk.red('-   "z": "40"'),
        chalk.green('+   "z": "30"'),
        chalk.grey('= }'),
      ];

      calls.forEach((arg, i) => {
        expect(log.getCall(i).args[0]).to.equal(arg);
      });

      expect(log.getCall(calls.length).args[0]).to.equal(
        `Showing potential changes in ${chalk.yellow(targetFilePath.replace('/', '\\'))}`
      );

      expect(
        prompt.calledOnceWith({
          type: 'list',
          name: 'choice',
          choices: ['yes', 'skip', 'yes to all', 'abort'],
          message: `File ${chalk.yellow(
            targetFilePath.replace('/', '\\')
          )} is about to be overwritten with the above changes. Are you sure you want to continue?`,
        })
      ).to.equal(true);

      expect(result).equal(true);
    });
  });

  describe('transform', () => {
    let diffFilesStub: SinonStub;
    let processExitStub: SinonStub;
    let writeFileToPathStub: SinonStub;

    afterEach(() => {
      diffFilesStub?.restore();
      processExitStub?.restore();
      writeFileToPathStub?.restore();
    });

    describe('transformPostInitializer', () => {
      it('should overwrite a single file', async () => {
        diffFilesStub = sinon.stub(transform, 'diffFiles').returns(Promise.resolve('yes'));
        writeFileToPathStub = sinon.stub(helpers, 'writeFileToPath');

        const answers = {
          appName: 'JssNextWeb',
          hostName: 'http://jssnextweb',
          destination: 'samples/next',
          fetchWith: 'REST',
          force: false,
          templates: [],
          language: 'en',
        };

        await diffAndWriteFiles({
          rendered: 'test',
          pathToNewFile: 'samples/next/{{language}}.txt',
          answers,
        });

        expect(writeFileToPathStub.calledOnceWith('samples/next/en.txt', 'test')).to.equal(true);

        expect(answers.force).to.equal(false);
      });

      it('should overwrite a single file and later do not ask the same question', async () => {
        diffFilesStub = sinon.stub(transform, 'diffFiles').returns(Promise.resolve('yes to all'));
        writeFileToPathStub = sinon.stub(helpers, 'writeFileToPath');

        const answers = {
          appName: 'JssNextWeb',
          hostName: 'http://jssnextweb',
          destination: 'samples/next',
          fetchWith: 'REST',
          force: false,
          templates: [],
          language: 'en',
        };

        await diffAndWriteFiles({
          rendered: 'test',
          pathToNewFile: 'samples/next/{{language}}.txt',
          answers,
        });

        expect(writeFileToPathStub.calledOnceWith('samples/next/en.txt', 'test')).to.equal(true);

        expect(answers.force).to.equal(true);
      });

      it('should skip file', async () => {
        diffFilesStub = sinon.stub(transform, 'diffFiles').returns(Promise.resolve('skip'));
        writeFileToPathStub = sinon.stub(helpers, 'writeFileToPath');

        const answers = {
          appName: 'JssNextWeb',
          hostName: 'http://jssnextweb',
          destination: 'samples/next',
          fetchWith: 'REST',
          force: false,
          templates: [],
          language: 'en',
        };

        await diffAndWriteFiles({
          rendered: 'test',
          pathToNewFile: 'samples/next/{{language}}.txt',
          answers,
        });

        expect(writeFileToPathStub.notCalled).to.equal(true);

        expect(answers.force).to.equal(false);
      });

      it('should abort a process', async () => {
        diffFilesStub = sinon.stub(transform, 'diffFiles').returns(Promise.resolve('abort'));
        writeFileToPathStub = sinon.stub(helpers, 'writeFileToPath');

        processExitStub = sinon.stub(process, 'exit');

        const answers = {
          appName: 'JssNextWeb',
          hostName: 'http://jssnextweb',
          destination: 'samples/next',
          fetchWith: 'REST',
          force: false,
          templates: [],
          language: 'en',
        };

        await diffAndWriteFiles({
          rendered: 'test',
          pathToNewFile: 'samples/next/{{language}}.txt',
          answers,
        });

        expect(writeFileToPathStub.notCalled).to.equal(true);

        expect(processExitStub.calledOnce).to.equal(true);

        expect(answers.force).to.equal(false);
      });
    });
  });
});
