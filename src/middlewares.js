import multer from "multer";
import { MongoClient } from "mongodb";

const uri = "mongodb+srv://rlagksalsq3:QSKg66kCtO5ZOwRW@cluster0.slo5zpz.mongodb.net/?retryWrites=true&w=majority"; // MongoDB 서버 주소
const dbName = "Cluster0"; // 사용할 데이터베이스 이름

const client = new MongoClient(uri);

const imageStorage = multer.diskStorage({
  destination: "uploads/avatars/",
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const videoStorage = multer.diskStorage({
  destination: "uploads/videos/",
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

export const localsMiddleware = (req, res, next) => {
  res.locals.loggedIn = Boolean(req.session.loggedIn);
  res.locals.siteName = "Spongetube";
  res.locals.loggedInUser = req.session.user || {};
  next();
};

export const protectorMiddleware = (req, res, next) => {
  if (req.session.loggedIn) {
    return next();
  } else {
    req.flash("error", "Log in first.");
    return res.redirect("/login");
  }
};

export const publicOnlyMiddleware = (req, res, next) => {
  if (!req.session.loggedIn) {
    return next();
  } else {
    req.flash("error", "Not authorized");
    return res.redirect("/");
  }
};

export const avatarUpload = multer({
  storage: imageStorage,
});

export const videoUpload = multer({
  storage: videoStorage,
});

export const connectToMongoDB = async () => {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
  }
};

export const closeMongoDBConnection = () => {
  client.close();
};

export const insertDocument = async (collectionName, document) => {
  try {
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    await collection.insertOne(document);
    console.log("Document inserted:", document);
  } catch (error) {
    console.error("Failed to insert document", error);
  }
};

// 다른 MongoDB 관련 함수들을 추가해야 함
