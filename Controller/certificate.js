const certificates = require('../Models/certificateModel')

//add

exports.addCertificate = async (req, res) => {
    console.log('Inside the certificate');
    const { image, category, startDate,expireDate,organization,links } = req.body;

    try {
        const newCertificate = new certificates({
            image,
            category,
            startDate,
            expireDate,
            organization,
            links
        });

        await newCertificate.save();

        res.status(200).json({
            success: true,
            message: 'Certificate added successfully',
            data: newCertificate
        });
    } catch (error) {
        console.error('Error adding certificate:', error);
        res.status(401).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};



// Get all certificates
exports.getCertificates = async (req, res) => {
    try {
        const allCertificates = await certificates.find();
        res.status(200).json({
            success: true,
            data: allCertificates
        });
    } catch (error) {
        console.error('Error fetching certificates:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};
