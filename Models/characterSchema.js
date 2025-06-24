const mongoose = require('mongoose');

const characterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String
  },
  image_url: {
    type: String // store full image URL or relative path
  },
  type: {
    type: String,
    enum: ['fictional', 'real', 'personal'],
    default: 'personal'
  }
}, { timestamps: true });

const character = mongoose.model('characterSchema', characterSchema);
module.exports = character
