const mongoose = require('mongoose');

const techStackSchema = new mongoose.Schema({
  name: String,
  type: String,
  logo: String,
  description: String,
});

 const TechStack = mongoose.model('TechStack', techStackSchema);
 module.exports = TechStack