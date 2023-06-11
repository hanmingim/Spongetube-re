import multer from "multer";
import { createS3Uploader } from "./s3";

const s3ImageUploader = createS3Uploader("images");
const s3VideoUploader = createS3Uploader("videos");

const isProduction = process.env.NODE_ENV === "production";

export const localsMiddleware = (req, res, next) => {
  res.locals.loggedIn = Boolean(req.session.loggedIn);
  res.locals.siteNmae = "wetube";
  res.locals.loggedInUser = req.session.user || {};
  res.locals.isProduction = isProduction;
  next();
};

export const protectorMiddleware = (req, res, next) => {
  if (req.session.loggedIn) {
    return next();
  }
  req.flash("error", "Log in first.");
  return res.redirect("/login");
};

export const publicOnlyMiddleware = (req, res, next) => {
  if (!req.session.loggedIn) {
    return next();
  }
  req.flash("error", "Not authorized");
  return res.redirect("/");
};

export const avatarUpload = multer({
  dest: "uploads/avatars/",
  limits: { fileSize: 100000000 }, // 100MB
  storage: isProduction ? s3ImageUploader : undefined,
});

export const videoUpload = multer({
  dest: "uploads/videos/",
  limits: { fileSize: 100000000 }, // 100MB
  storage: isProduction ? s3VideoUploader : undefined,
});

export const setFilePathMiddleware = (req, res, next) => {
  req.filePath = (file) => (isProduction ? file.location : file.path);
  next();
};
