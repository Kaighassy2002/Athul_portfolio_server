const mongoose = require('mongoose')


const certificateSchema = new mongoose.Schema({
    image:{
        type:String,
        required:true
    },
    category:{
        type:String,
        required:true 
    },
    startDate:{
        type:String,
        required:true 
    },
    expireDate:{
        type:String,
         
    },
    organization:{
        type:String,
        required:true 
    },
    links:{
        type:String,
        required:true 
    }
})
const certificates = mongoose.model("certificate",certificateSchema)

module.exports = certificates