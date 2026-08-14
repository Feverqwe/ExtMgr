declare module 'promise-limit' {
  export default function promiseLimit(
    concurrency: number,
  ): <T>(task: () => PromiseLike<T>) => Promise<T>;
}
