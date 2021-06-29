/* eslint-disable @typescript-eslint/no-explicit-any */
// https://github.com/airbnb/enzyme/blob/master/docs/guides/jsdom.md

// eslint-disable-next-line no-var
declare var global: any;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { JSDOM } = require('jsdom');

const jsdom = new JSDOM('<!doctype html><html><body></body></html>');
const jsDomWindow = jsdom.window;

/**
 * @param {any} src
 * @param {any} target
 */
function copyProps(src: any, target: any) {
  const props = Object.getOwnPropertyNames(src)
    .filter((prop) => typeof target[prop] === 'undefined')
    .reduce(
      (result, prop) => ({
        ...result,
        [prop]: Object.getOwnPropertyDescriptor(src, prop),
      }),
      {}
    );

  Object.defineProperties(target, props);
}

global.window = jsDomWindow;
global.document = jsDomWindow.document;
global.navigator = {
  userAgent: 'node.js',
};

global.HTMLElement = jsDomWindow.HTMLElement; // makes chai "happy" https://github.com/chaijs/chai/issues/1029
copyProps(jsDomWindow, global);

export {};