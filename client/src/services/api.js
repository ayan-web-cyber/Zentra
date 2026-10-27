import axios from 'axios';

// Defaults to a relative path, which only works when the frontend and backend share an
// origin (local dev via Vite's proxy, or a production setup where one server/reverse-proxy
// serves both). If you deploy them separately — frontend on Vercel/Netlify, backend on
// Render/Railway/EC2, for example — every request here would silently 404 against the
// frontend's own domain with no visible error beyond "pages don't load." Set VITE_API_URL
// (e.g. https://api.yourdomain.com/api) at build time to point at the real backend instead.
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  withCredentials: true,
});

export default api;
