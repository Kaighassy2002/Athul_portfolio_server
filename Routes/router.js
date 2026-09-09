const express = require("express");
const router = express.Router();
const certificateController = require("../Controller/certificate");
const editController = require("../Controller/editController");
const scribbleController = require("../Controller/scribbileController");
const projectController = require("../Controller/projectController");
const authController = require("../Controller/authController");
const engagementController = require("../Controller/engagementController");
const contactController = require("../Controller/contactController");
const sitemapController = require("../Controller/sitemapController");
const { requireAuth, optionalAuth, requireVerified } = require("../middleware/auth");
const { upload, rejectUnsafeImage } = require("../middleware/upload");
const {
  authLimiter,
  resetLimiter,
  contactLimiter,
  engageLimiter,
  viewShareLimiter,
  commentLimiter,
  uploadLimiter,
} = require("../middleware/rateLimit");

router.get("/sitemap.xml", sitemapController.sitemap);

router.get("/auth/config", authController.getAuthConfig);
router.post("/auth/signup", authLimiter, authController.signup);
router.post("/auth/login", authLimiter, authController.login);
router.post("/auth/google", authLimiter, authController.googleLogin);
router.post("/auth/forgot", resetLimiter, authController.forgotPassword);
router.post("/auth/reset", resetLimiter, authController.resetPassword);
router.post("/auth/verify", authController.verifyEmail);
router.post("/auth/resend-verification", resetLimiter, authController.resendVerification);
router.post("/auth/refresh", authController.refresh);
router.post("/auth/logout", authController.logout);
router.get("/auth/me", requireAuth, authController.me);

router.get("/list", editController.getAllBlogPosts);
router.get("/list-blog", editController.getAllBlogPosts);
router.get("/blog/:id/engagement", optionalAuth, engagementController.getEngagement);
router.post("/blog/:id/like", requireAuth, requireVerified, engageLimiter, engagementController.toggleLike);
router.post("/blog/:id/comments", requireAuth, requireVerified, commentLimiter, engagementController.addComment);
router.post("/blog/:id/view", viewShareLimiter, engagementController.recordView);
router.post("/blog/:id/share", viewShareLimiter, engagementController.recordShare);
router.delete("/blog-comments/:id", requireAuth, engagementController.deleteComment);
router.get("/blog/:id", editController.getEditorContentById);

router.get("/list-scribble", scribbleController.getScribbleContents);
router.get("/scribble/:id", scribbleController.getScribbleContentById);
router.get("/character-items", scribbleController.getCharacters);
router.get("/tech-items", editController.getTechStack);
router.get("/getprojects", projectController.getAllProjects);
router.get("/getAllcertificates", certificateController.getCertificates);

router.post("/contact", contactLimiter, contactController.sendContact);

router.post("/blog/save", editController.createBlogPost);
router.put("/update-blog/:id", editController.updateBlogContentById);
router.patch("/publish-blog/:id", editController.toggleBlogPublish);
router.delete("/delete-blog/:id", editController.deleteBlogPost);

router.post("/scribble/save", scribbleController.createScribble);
router.put("/update-scribble/:id", scribbleController.updateScribbleById);
router.patch("/publish-scribble/:id", scribbleController.toggleScribblePublish);
router.delete("/delete-scribble/:id", scribbleController.deleteScribble);

router.post("/character", scribbleController.createCharacter);
router.post(
  "/add-tech",
  uploadLimiter,
  upload.single("logo"),
  rejectUnsafeImage,
  editController.addTechStack
);
router.post("/addproject", projectController.createProject);
router.delete("/projects/:id", projectController.deleteProject);
router.post("/addcertificate", certificateController.addCertificate);
router.delete("/certificates/:id", certificateController.deleteCertificate);

router.get("/admin/blogs", editController.adminListBlogs);
router.get("/admin/blog/:id", editController.adminGetBlogById);
router.get("/admin/scribbles", scribbleController.adminListScribbles);
router.get("/admin/scribble/:id", scribbleController.adminGetScribbleById);
router.get("/admin/comments", engagementController.listComments);
router.patch("/admin/comments/:id/approve", engagementController.approveComment);
router.delete("/admin/comments/:id", engagementController.adminDeleteComment);

module.exports = router;
