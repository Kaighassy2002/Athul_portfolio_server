const express = require('express');
const router = express.Router();
const certificateController = require('../Controller/certificate')


//add project
router.post('/addcertificate',certificateController.addCertificate)

//get project
router.get('/getAllcertificates',certificateController.getCertificates)


module.exports = router