export const tileUrlById = (() => {
  const urls = import.meta.glob("../game-components/images/tiles/*.png",
    {
    eager: true,
    query: "?url",
    import: "default",
  });

  return Object.fromEntries(
    Object.entries(urls).map(([path, url]) => {
      const file = path.split("/").pop();    // "0.png"
      const id = file.replace(".png", "");   // "0"
      return [id, url];
    })
  );
})();
