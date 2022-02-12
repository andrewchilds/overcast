import chalk from 'chalk';

export const faded = (str) => {
  console.log(chalk.blackBright(str));
}

export const success = (str) => {
  console.log(chalk.greenBright(str));
};

export const info = (str) => {
  console.log(chalk.cyanBright(str));
};

export const alert = (str) => {
  console.log(chalk.yellowBright(str));
};

export const failure = (str) => {
  console.log(chalk.red(str));
};

export const br = () => {
  console.log('');
};
