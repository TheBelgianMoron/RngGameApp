import { App } from './app/App';

const app = new App();

document.addEventListener('DOMContentLoaded', async () => {
  await app.init();
});
