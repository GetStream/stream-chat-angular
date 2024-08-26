module.exports = {
  plugins: [
    [
      "@docusaurus/plugin-content-docs",
      {
        lastVersion: "current",
        versions: {
          current: {
            label: "v5",
          },
          4: {
            label: "v4",
            banner: "unmaintained",
            path: "4",
          },
        },
      },
    ],
  ],
};
