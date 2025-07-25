const express = require('express');
const cors = require('cors');
const app = express();
const admin = require("firebase-admin");
const serviceAccount = require("./SDK_KEY.json");
const port =process.env.PORT|| 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

// Middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cmpq8iw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


// firebase JWT




admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});



const verifyFirebaseToken=async(req,res,next)=>{
  
   const authHeader=req.headers?.authorization;
   console.log(authHeader)
   
   if(!authHeader || !authHeader.startsWith('Bearer ')){
    return res.status(401).send({message: "Unauthorized Access"})
   }

   
   
   
   const token=authHeader.split(" ")[1];
   console.log(token)

   
   if(!token){
    return res.status(401).send({message: "Unauthorized Access"})
   }
     
   

   


   try{
    const decoded=await admin.auth().verifyIdToken(token)
    req.decoded=decoded;
    console.log("decoded token",req.decoded.email)
    next();
   }catch(error){
      return res.status(401).send({message: "Unauthorized Access"})
   }
    // console.log("token in the middle ware",token)
   
}

// firebase jwt end



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollections=client.db('Blood-Lagbe').collection('users');
    

     const verifyAdmin = async (req, res, next) => {

      const user = await usersCollections.findOne({
        email: req.decoded.email,
      });

      if (user.role === "admin") {
        next();
      } else {
        res.status(403).send({ msg: "unauthorized" });
      }
    };

    
    app.post("/add-user",async(req,res)=>{
        const newUser=req.body;
        const find_result=await usersCollections.findOne({email:newUser.email});
        if(find_result){
          res.send({ msg: "user already exist" });
        }
        else{
          const result=await usersCollections.insertOne(newUser);
        res.send(result)
          
        }
        
    })

    app.get("/users-role",verifyFirebaseToken,async(req,res)=>{
      const email=req.decoded.email;
      console.log("user role email",email)
      const query={email : email}
        const result=await usersCollections.findOne(query)
        res.send(result)
    })


    app.get("/users",verifyFirebaseToken,verifyAdmin,async(req,res)=>{
      const query={email : {$ne: req.decoded.email}}
      const result=await usersCollections.find(query).toArray()
      res.send(result)
    })




   




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Server is running!');
});





app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
