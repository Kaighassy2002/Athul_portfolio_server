require('dotenv').config()
const express = require('express')
const cors = require('cors')
const router = require('./Routes/router')
require('./DB/connection')


const portfolioServer = express();


portfolioServer.use(cors());
portfolioServer.use(express.json());
portfolioServer.use(router);


const PORT = 3000 || process.env.PORT

portfolioServer.listen(PORT,()=>{
    console.log(`prtfolio Server start at port :${PORT}`);
})

portfolioServer.get('/',(req,res)=>{
    res.status(200).send(`<h1 style="color:red">portfolio Server start and waiting for client Request!!!</h1>`)
})

