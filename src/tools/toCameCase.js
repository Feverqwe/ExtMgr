const toCameCase = string => {
  return string.replace(/_(.)/g, (a, b) => {
    return b.toUpperCase();
  })
};

export default toCameCase;