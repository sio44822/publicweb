// Vercel Serverless Function 入口：直接匯出 Express app，所有請求由 vercel.json 路由至此
import app from '../app.js';

export default app;
