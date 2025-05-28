const express = require('express');
const router = express.Router();
const certificateController = require('../Controller/certificate')
const editController = require('../Controller/editController')

//add project
router.post('/addcertificate',certificateController.addCertificate)

//get project
router.get('/getAllcertificates',certificateController.getCertificates)

// editor save
router.post('/save',editController.saveEditorContent)

//list 
router.get('/list', editController.getEditorContents);

//open with id 
router.get("/blog/:id", editController.getEditorContentById);

// update 
router.put("/update/:id",editController.updateEditorContentById)

module.exports = router