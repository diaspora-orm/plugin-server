export const config = {
	port:    2995,
  basePath: '/api',
  baseUrl: '',
};
config.baseUrl = `http://localhost:${config.port}${config.basePath}`;
