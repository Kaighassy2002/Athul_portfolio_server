const express = require('express');
const router = express.Router();
const certificateController = require('../Controller/certificate')
const editController = require('../Controller/editController')
const scribbileController = require('../Controller/scribbileController')
const upload = require('../middileware/multerConfig')
 const projectController = require('../Controller/projectController')
const authController = require('../Controller/authController')
const engagementController = require('../Controller/engagementController')
const { requireAuth, optionalAuth } = require('../middileware/auth')


//add project
router.post('/addcertificate',certificateController.addCertificate)

//get project
router.get('/getAllcertificates',certificateController.getCertificates)

// editor save blog post
router.post('/blog/save',editController.createBlogPost)

// editor save scribble post
router.post('/scribble/save',scribbileController.createScribble)

//list 
router.get('/list', editController.getAllBlogPosts);
router.get('/list-blog', editController.getAllBlogPosts);

//open with id 
router.get("/auth/config", authController.getAuthConfig)
router.post("/auth/signup", authController.signup)
router.post("/auth/login", authController.login)
router.post("/auth/google", authController.googleLogin)
router.post("/auth/forgot", authController.forgotPassword)
router.post("/auth/reset", authController.resetPassword)
router.get("/auth/me", requireAuth, authController.me)

router.get("/blog/:id/engagement", optionalAuth, engagementController.getEngagement)
router.post("/blog/:id/like", requireAuth, engagementController.toggleLike)
router.post("/blog/:id/comments", requireAuth, engagementController.addComment)
router.post("/blog/:id/view", engagementController.recordView)
router.post("/blog/:id/share", engagementController.recordShare)
router.delete("/blog-comments/:id", requireAuth, engagementController.deleteComment)

router.get("/admin/comments", engagementController.listComments)
router.patch("/admin/comments/:id/approve", engagementController.approveComment)
router.delete("/admin/comments/:id", engagementController.adminDeleteComment)

router.get("/blog/:id", editController.getEditorContentById);

//scriible by id
router.get("/scribble/:id", scribbileController.getScribbleContentById);

// update blog
router.put("/update-blog/:id",editController.updateBlogContentById)

//update scribble
router.put("/update-scribble/:id",scribbileController.updateScribbleById)

router.get('/list-scribble', scribbileController.getScribbleContents);

// editor save scribble post
router.post('/character',scribbileController.createCharacter)

// editor save scribble get
router.get('/character-items',scribbileController.getCharacters)

// post tech stack
router.post('/add-tech', upload.single('logo'), editController.addTechStack);

//get tech stack

router.get('/tech-items',editController.getTechStack)

router.patch("/publish-blog/:id", editController.toggleBlogPublish);

router.patch("/publish-scribble/:id", scribbileController.toggleScribblePublish);

router.delete("/delete-blog/:id", editController.deleteBlogPost);

router.delete("/delete-scribble/:id", scribbileController.deleteScribble);


router.post('/addproject',projectController.createProject)

router.get('/getprojects', projectController.getAllProjects);

module.exports = router