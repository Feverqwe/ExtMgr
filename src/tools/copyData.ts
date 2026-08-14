function copyData<T>(obj: T): T {
  // Firefox incorrect stringify mobx model when save in storage
  return JSON.parse(JSON.stringify({w: obj})).w as T;
}

export default copyData;
