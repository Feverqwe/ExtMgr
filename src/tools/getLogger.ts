interface Logger {
  (...data: unknown[]): void;
  log: (...data: unknown[]) => void;
  info: (...data: unknown[]) => void;
  warn: (...data: unknown[]) => void;
  error: (...data: unknown[]) => void;
  debug: (...data: unknown[]) => void;
}

const colors = [
  '#0000CC',
  '#0000FF',
  '#0033CC',
  '#0033FF',
  '#0066CC',
  '#0066FF',
  '#0099CC',
  '#0099FF',
  '#00CC00',
  '#00CC33',
  '#00CC66',
  '#00CC99',
  '#00CCCC',
  '#00CCFF',
  '#3300CC',
  '#3300FF',
  '#3333CC',
  '#3333FF',
  '#3366CC',
  '#3366FF',
  '#3399CC',
  '#3399FF',
  '#33CC00',
  '#33CC33',
  '#33CC66',
  '#33CC99',
  '#33CCCC',
  '#33CCFF',
  '#6600CC',
  '#6600FF',
  '#6633CC',
  '#6633FF',
  '#66CC00',
  '#66CC33',
  '#9900CC',
  '#9900FF',
  '#9933CC',
  '#9933FF',
  '#99CC00',
  '#99CC33',
  '#CC0000',
  '#CC0033',
  '#CC0066',
  '#CC0099',
  '#CC00CC',
  '#CC00FF',
  '#CC3300',
  '#CC3333',
  '#CC3366',
  '#CC3399',
  '#CC33CC',
  '#CC33FF',
  '#CC6600',
  '#CC6633',
  '#CC9900',
  '#CC9933',
  '#CCCC00',
  '#CCCC33',
  '#FF0000',
  '#FF0033',
  '#FF0066',
  '#FF0099',
  '#FF00CC',
  '#FF00FF',
  '#FF3300',
  '#FF3333',
  '#FF3366',
  '#FF3399',
  '#FF33CC',
  '#FF33FF',
  '#FF6600',
  '#FF6633',
  '#FF9900',
  '#FF9933',
  '#FFCC00',
  '#FFCC33',
];

function selectColor(namespace: string) {
  let hash = 0;

  for (let index = 0; index < namespace.length; index += 1) {
    hash = (hash * 31 + namespace.charCodeAt(index)) % 2147483647;
  }

  return colors[Math.abs(hash) % colors.length];
}

/**
 */
const getLogger = (name: string): Logger => {
  let fn: Logger;
  if (typeof BUILD_ENV !== 'undefined' && BUILD_ENV.FLAG_ENABLE_LOGGER) {
    const colorArgs: string[] = [];
    if (BUILD_ENV.mode === 'development') {
      colorArgs.push(`%c${name}`, `color: ${selectColor(name)}`);
    } else {
      colorArgs.push(name);
    }
    fn = console.log.bind(console, ...colorArgs) as Logger;
    fn.log = fn;
    fn.info = console.info.bind(console, ...colorArgs);
    fn.warn = console.warn.bind(console, ...colorArgs);
    fn.error = console.error.bind(console, ...colorArgs);
    fn.debug = console.debug.bind(console, ...colorArgs);
  } else {
    fn = (() => {}) as Logger;
    fn.log = fn.info = fn.warn = fn.error = fn.debug = fn;
  }
  return fn;
};

export default getLogger;
