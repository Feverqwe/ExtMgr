const toCameCase = (string: string) => {
  return string.replace(/_(.)/g, (_match, character: string) => {
    return character.toUpperCase();
  });
};

export default toCameCase;
