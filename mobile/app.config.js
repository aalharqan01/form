// Extends app.json. FORM_APP_BASE_URL makes a web export live under a path
// (the deployed website serves the app at /app); local dev leaves it unset.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.FORM_APP_BASE_URL
      ? { baseUrl: process.env.FORM_APP_BASE_URL }
      : {}),
  },
});
