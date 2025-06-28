const express = require('express');
const router = express.Router();
const certificateController = require('../Controller/certificate')
const editController = require('../Controller/editController')
const scribbileController = require('../Controller/scribbileController')
const upload = require('../middileware/multerConfig')

//add project
router.post('/addcertificate',certificateController.addCertificate)

//get project
router.get('/getAllcertificates',certificateController.getCertificates)

// editor save blog post
router.post('/blog/save',editController.createBlogPost)

// editor save scribble post
router.post('/scribble/save',scribbileController.createScribble)

//list 
router.get('/list-blog', editController.getAllBlogPosts);

//open with id 
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

module.exports = router