const certificates = require("../Models/certificateModel");
const { fail } = require("../utils/httpError");
const { clampString, requireId } = require("../utils/validate");

exports.addCertificate = async (req, res, next) => {
  try {
    const image = clampString(req.body?.image, 2000);
    const category = clampString(req.body?.category, 120);
    const startDate = clampString(req.body?.startDate, 40);
    const expireDate = clampString(req.body?.expireDate, 40);
    const organization = clampString(req.body?.organization, 160);
    const links = clampString(req.body?.links, 2000);
    if (!image || !category || !startDate || !organization || !links) {
      throw fail(400, "Required certificate fields are missing.");
    }
    const newCertificate = await certificates.create({
      image,
      category,
      startDate,
      expireDate,
      organization,
      links,
    });
    res.status(200).json({
      success: true,
      message: "Certificate added successfully",
      data: newCertificate,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCertificates = async (req, res, next) => {
  try {
    const allCertificates = await certificates.find().limit(100);
    res.status(200).json({
      success: true,
      data: allCertificates,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteCertificate = async (req, res, next) => {
  try {
    const id = requireId(req.params.id, "Certificate");
    const deleted = await certificates.findByIdAndDelete(id);
    if (!deleted) throw fail(404, "Certificate not found");
    res.status(200).json({ success: true, message: "Certificate deleted." });
  } catch (error) {
    next(error);
  }
};
