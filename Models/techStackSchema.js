const mongoose = require('mongoose');

const techStackSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    
    trim: true
  },
  logo: {
    type: String,
   
    trim: true,
    // Example: '/uploads/logos/logo123.png'
  },
  description: {
    type: String,
    
    trim: true
  }
});

const TechStack = mongoose.model('TechStack', techStackSchema);
module.exports = TechStack;
