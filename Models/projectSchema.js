const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    tech_stack: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TechStack' }],
     type: {
    type: String,
    default: "project",
    enum: ["project"],
    required: true,
  },
  image:{
    type: String
  }
})

const projects = mongoose.model('project',projectSchema)
module.exports=  projects