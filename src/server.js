import express from 'express';
import morgan from 'morgan';
import session from 'express-session';
import flash from 'express-flash';
import MongoStore from 'connect-mongo';
import rootRouter from './routers/rootRouter';
import videoRouter from './routers/videoRouter';
import userRouter from './routers/userRouter';
import apiRouter from './routers/apiRouter';
import { localsMiddleware, setFilePathMiddleware } from './middlewares';

const app = express();

// 1. Middleware setup
app.use(morgan('dev')); // logger
app.use(express.urlencoded({ extended: true })); // parse Request Object as strings or arrays
app.use(express.json()); // parse Request Object as a JSON Object
app.use(flash());

// 2. Session setup
app.use(
  session({
    secret: process.env.COOKIE_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.DB_URL,
      dbName: process.env.DB_NAME,
    }),
  }),
);

// Use middleware that depends on session after session setup
app.use(localsMiddleware);
app.use(setFilePathMiddleware);

// 3. CORS headers setup
app.use((req, res, next) => {
  res.header('Cross-Origin-Embedder-Policy', 'credentialless');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// 4. Static assets setup
app.use('/uploads', express.static('uploads'));
app.use('/static', express.static('assets'));

// 5. View engine setup
app.set('view engine', 'pug');
app.set('views', `${process.cwd()}/src/views`);

// 6. Routing
app.use('/', rootRouter);
app.use('/videos', videoRouter);
app.use('/users', userRouter);
app.use('/api', apiRouter);

export default app;