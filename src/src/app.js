import express from 'express';
import morgan from 'morgan';
import statusMonitor from 'express-status-monitor';
import router from './route.js';
import cors from 'cors';
import bodyParser from 'body-parser';
import { dirname } from "path";
import path from "path";
import { fileURLToPath } from 'url';


const __dirname = fileURLToPath(dirname(import.meta.url))

const app = express();

app.use("/public", express.static(path.join(__dirname, "utils", "/", "upload")))
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(morgan('dev'));
app.use(cors());
app.use(statusMonitor());
app.setMaxListeners(100);
app.use('/', router);

export default app;
