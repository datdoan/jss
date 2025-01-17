import chalk from 'chalk';
import chokidar from 'chokidar';
import path from 'path';
import { initRunner } from '../src/init-runner';

chokidar
  .watch(path.join(process.cwd(), '.\\src\\templates'), { ignoreInitial: true })
  .on('ready', () => ready())
  .on('all', (event, path) => callback(event, path));

async function ready() {
  console.log(chalk.green('Initializing app...'));
  await initializeApps(false);
  console.log(chalk.green('Initializing app complete. Watching for changes...'));
}

async function callback(event?: string, path?: string) {
  const color = event === 'add' ? chalk.green : event === 'unlink' ? chalk.red : chalk.white;
  console.table(color(`${event} ${path}`));
  await initializeApps(true);
}

const initializeApps = async (noInstall: boolean) => {
  let watch;
  try {
    watch = await import(path.resolve('watch.json'));
    const initializers = watch.initializers || [];
    await initRunner(initializers, { ...watch.args, templates: initializers, noInstall });
  } catch (error) {
    console.log(chalk.red('An error occurred: ', error));
    if (!watch) {
      console.log(
        chalk.red('Could not find config. Did you create a watch.json file at the root?')
      );
      process.exit(1);
    }
  }
};
