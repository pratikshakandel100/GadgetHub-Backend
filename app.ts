import express, {Application, NextFunction, Request, Response} from 'express';
import { HttpException } from './exceptions/http-exception';

import corse from "cors";
import morgon from "morgan";

const app: Application = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}));

export default app;