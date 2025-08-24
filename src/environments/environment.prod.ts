export const environment = {
  production: true,
  githubClientId: process.env['GITHUB_CLIENT_ID'] || '',
  githubClientAppId: process.env['GITHUB_CLIENT_APP_ID'] || '',
  useMockData: false,
  apiUrl: process.env['API_URL'] || ''
};