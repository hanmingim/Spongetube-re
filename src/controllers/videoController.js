import Video from "../models/Video";
import Comment from "../models/Comment";
import User from "../models/User";

/**
 * home - 비디오 목록을 포함하는 홈 페이지를 렌더링합니다.
 *
 * @param {object} req - 요청 객체
 * @param {object} res - 응답 객체
 */
export const home = async (req, res) => {
  try {
    const videos = await Video.find({})
      .sort({ createdAt: "desc" })
      .populate("owner");
    return res.render("home", { pageTitle: "Home", videos });
  } catch (error) {
    console.error("비디오 조회 오류:", error);
    return res.status(500).render("error", {
      pageTitle: "에러",
      errorMessage: "비디오 조회에 실패했습니다.",
    });
  }
};

/**
 * watch - 특정 비디오의 시청 페이지를 렌더링합니다.
 *
 * @param {object} req - 요청 객체
 * @param {object} res - 응답 객체
 */
export const watch = async (req, res) => {
  const { id } = req.params;
  try {
    const video = await Video.findById(id)
      .populate("owner")
      .populate("comments");
    if (!video) {
      return res.status(404).render("404", { pageTitle: "비디오를 찾을 수 없습니다." });
    }
    return res.render("watch", { pageTitle: video.title, video });
  } catch (error) {
    console.error("비디오 조회 오류:", error);
    return res.status(500).render("error", {
      pageTitle: "에러",
      errorMessage: "비디오 조회에 실패했습니다.",
    });
  }
};

/**
 * getEdit - 특정 비디오의 수정 페이지를 렌더링합니다.
 *
 * @param {object} req - 요청 객체
 * @param {object} res - 응답 객체
 */
export const getEdit = async (req, res) => {
  const { id } = req.params;
  const {
    user: { _id },
  } = req.session;
  try {
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).render("404", { pageTitle: "비디오를 찾을 수 없습니다." });
    }
    if (String(video.owner) !== String(_id)) {
      req.flash("error", "권한이 없습니다.");
      return res.status(403).redirect("/");
    }
    return res.render("edit", { pageTitle: `편집: ${video.title}`, video });
  } catch (error) {
    console.error("비디오 조회 오류:", error);
    return res.status(500).render("error", {
      pageTitle: "에러",
      errorMessage: "비디오 조회에 실패했습니다.",
    });
  }
};

/**
 * postEdit - 수정된 비디오 양식을 처리합니다.
 *
 * @param {object} req - 요청 객체
 * @param {object} res - 응답 객체
 */
export const postEdit = async (req, res) => {
  const {
    user: { _id },
  } = req.session;
  const { id } = req.params;
  const { title, description, hashtags } = req.body;
  try {
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).render("404", { pageTitle: "비디오를 찾을 수 없습니다." });
    }
    if (String(video.owner) !== String(_id)) {
      req.flash("error", "비디오의 소유자가 아닙니다.");
      return res.status(403).redirect("/");
    }
    await Video.findByIdAndUpdate(id, {
      title,
      description,
      hashtags: Video.formatHashtags(hashtags),
    });
    req.flash("success", "변경 사항이 저장되었습니다.");
    return res.redirect(`/videos/${id}`);
  } catch (error) {
    console.error("비디오 업데이트 오류:", error);
    return res.status(500).render("error", {
      pageTitle: "에러",
      errorMessage: "비디오 업데이트에 실패했습니다.",
    });
  }
};

/**
 * getUpload - 비디오 업로드 페이지를 렌더링합니다.
 *
 * @param {object} req - 요청 객체
 * @param {object} res - 응답 객체
 */
export const getUpload = (req, res) =>
  res.render("upload", { pageTitle: "비디오 업로드" });

/**
 * postUpload - 업로드된 비디오 양식을 처리합니다.
 *
 * @param {object} req - 요청 객체
 * @param {object} res - 응답 객체
 */
export const postUpload = async (req, res) => {
  const {
    user: { _id },
  } = req.session;
  const { video, thumb } = req.files;
  const { title, description, hashtags } = req.body;
  try {
    const newVideo = await Video.create({
      title,
      description,
      fileUrl: video[0].path,
      thumbUrl: thumb[0].path,
      owner: _id,
      hashtags: Video.formatHashtags(hashtags),
    });
    const user = await User.findById(_id);
    user.videos.push(newVideo._id);
    user.save();
    return res.redirect("/");
  } catch (error) {
    console.error("비디오 업로드 오류:", error);
    return res.status(400).render("upload", {
      pageTitle: "비디오 업로드",
      errorMessage: error._message,
    });
  }
};

/**
 * deleteVideo - 특정 비디오를 삭제합니다.
 *
 * @param {object} req - 요청 객체
 * @param {object} res - 응답 객체
 */
export const deleteVideo = async (req, res) => {
  const { id } = req.params;
  const {
    user: { _id },
  } = req.session;
  try {
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).render("404", { pageTitle: "비디오를 찾을 수 없습니다." });
    }
    if (String(video.owner) !== String(_id)) {
      return res.status(403).redirect("/");
    }
    await Video.findByIdAndDelete(id);
    return res.redirect("/");
  } catch (error) {
    console.error("비디오 삭제 오류:", error);
    return res.status(500).render("error", {
      pageTitle: "에러",
      errorMessage: "비디오 삭제에 실패했습니다.",
    });
  }
};

/**
 * search - 검색 결과를 포함하는 검색 페이지를 렌더링합니다.
 *
 * @param {object} req - 요청 객체
 * @param {object} res - 응답 객체
 */
export const search = async (req, res) => {
  const { keyword } = req.query;
  try {
    let videos = [];
    if (keyword) {
      videos = await Video.find({
        title: {
          $regex: new RegExp(`${keyword}`, "i"),
        },
      }).populate("owner");
    }
    return res.render("search", { pageTitle: "검색", videos });
  } catch (error) {
    console.error("비디오 검색 오류:", error);
    return res.status(500).render("error", {
      pageTitle: "에러",
      errorMessage: "비디오 검색에 실패했습니다.",
    });
  }
};

/**
 * registerView - 특정 비디오의 조회수를 증가시킵니다.
 *
 * @param {object} req - 요청 객체
 * @param {object} res - 응답 객체
 */
export const registerView = async (req, res) => {
  const { id } = req.params;
  try {
    const video = await Video.findById(id);
    if (!video) {
      return res.sendStatus(404);
    }
    video.meta.views += 1;
    await video.save();
    return res.sendStatus(200);
  } catch (error) {
    console.error("조회수 등록 오류:", error);
    return res.sendStatus(500);
  }
};

/**
 * createComment - 특정 비디오에 댓글을 추가합니다.
 *
 * @param {object} req - 요청 객체
 * @param {object} res - 응답 객체
 */
export const createComment = async (req, res) => {
  const {
    session: {
      user: { _id },
    },
    body: { text },
    params: { id },
  } = req;
  try {
    const video = await Video.findById(id);
    if (!video) {
      return res.sendStatus(404);
    }
    const comment = await Comment.create({
      text,
      owner: _id,
      video: id,
    });
    video.comments.push(comment._id);
    await video.save();
    return res.status(201).json({ newCommentId: comment._id });
  } catch (error) {
    console.error("댓글 생성 오류:", error);
    return res.sendStatus(500);
  }
};

/**
 * deleteComment - 특정 비디오의 댓글을 삭제합니다.
 *
 * @param {object} req - 요청 객체
 * @param {object} res - 응답 객체
 */
export const deleteComment = async (req, res) => {
  const { commentId } = req.params;
  const {
    user: { _id },
  } = req.session;

  try {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
    }

    if (String(comment.owner) !== String(_id)) {
      return res
        .status(403)
        .json({ message: "이 댓글을 삭제할 권한이 없습니다." });
    }

    await Video.updateOne(
      { comments: commentId },
      { $pull: { comments: commentId } },
    );
    await Comment.findByIdAndDelete(commentId);

    return res.sendStatus(200);
  } catch (error) {
    console.error("댓글 삭제 오류:", error);
    return res.status(500).json({ message: "댓글 삭제에 실패했습니다." });
  }
};
