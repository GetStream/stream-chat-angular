module.exports = {
  plugins: [
    [
      "@docusaurus/plugin-content-docs",
      {
        lastVersion: "current",
        versions: {
          5: {
            label: "v5 (beta)",
            banner: "unreleased",
            path: "5",
          },
          current: {
            label: "v4",
          },
        },
      },
    ],
  ],
};
