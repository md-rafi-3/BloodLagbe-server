const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config()
const admin = require("firebase-admin");
const serviceAccount = require("./SDK_KEY.json");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const port =process.env.PORT|| 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { Query } = require('firebase-admin/firestore');



console.log("Stripe key is:", process.env.STRIPE_SECRET_KEY); 

// Middleware
app.use(cors(
  {
     origin: "http://localhost:5173", 
     credentials: true
  }
));
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
    const requestsCollections=client.db('Blood-Lagbe').collection('requests');
    const fundingsCollection = client.db('Blood-Lagbe').collection('fundings');
    const blogsCollection = client.db('Blood-Lagbe').collection('blogs');
    

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


    // stripe
    app.post("/create-payment-intent",async (req, res) => {
  const { amount } = req.body;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // convert to cents
    currency: "usd",
    payment_method_types: ["card"],
  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

// end stripe

// add funding api

app.post("/add-funding",async(req,res)=>{
  const newFund=req.body;
  console.log(newFund)
  const result=await fundingsCollection.insertOne(newFund);
  res.send(result)
})



app.get("/funding-data",verifyFirebaseToken,async(req,res)=>{
   const {page}=req.query;
   const totalCount=await fundingsCollection.countDocuments()
  const result=await fundingsCollection.find().skip((page-1)*5).limit(5).toArray()
  res.send({result,totalCount})
})
// add funding api end

    app.get("/users-role",verifyFirebaseToken,async(req,res)=>{
      const email=req.decoded.email;
      console.log("user role email",email)
      const query={email : email}
        const result=await usersCollections.findOne(query)
        res.send(result)
    })


    app.get("/users",verifyFirebaseToken,verifyAdmin,async(req,res)=>{
      const {page,status,name}=req.query;
      const query={email : {$ne: req.decoded.email}}
      if(status){
        query.status=status
      }

      if(name){
         query.name= { $regex: name, $options: "i" }
      }
      const totalCount=await usersCollections.countDocuments(query)
      const result=await usersCollections.find(query).skip((page-1)*5).limit(5).toArray()
      res.send({result,totalCount})
    })

    app.get("/all-users",async(req,res)=>{
      const {bloodGroup,divisionName,districtName,upazilaName}=req.query;
      console.log(bloodGroup,divisionName,districtName,upazilaName)
       const query={status:"active"};

       if(bloodGroup&&divisionName&&districtName&&upazilaName){
        query.bloodGroup= { $regex: bloodGroup, $options: "i" };
        query.division= { $regex: divisionName, $options: "i" };
        query.district= { $regex: districtName, $options: "i" };
        query.upazila= { $regex: upazilaName, $options: "i" };
       }
       const result=await usersCollections.find(query).toArray()
       res.send(result)
    })


    app.get("/total",verifyFirebaseToken,async(req,res)=>{
      const totalUsers=await usersCollections.countDocuments({role:"donor"})

      const totalRequests=await requestsCollections.countDocuments()

      const total=await fundingsCollection.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" }
        }
      }
    ]).toArray();

     const totalFunding = total[0]?.totalAmount || 0;

    console.log("total fund",totalFunding)
      res.send({totalUsers,totalFunding,totalRequests})
    })



    // request related api
    app.post("/donation-requests",async(req,res)=>{
      const newRequest=req.body;
      const result=await requestsCollections.insertOne(newRequest);
      res.send(result)
    })



    app.get("/my-requests",verifyFirebaseToken,async(req,res)=>{
      const email=req.decoded.email;
      const query={requesterEmail: email}
      const result=await requestsCollections.find(query).toArray();
      res.send(result)
    })


    app.get("/all-requests",async(req,res)=>{
      const {page}=req.query;
      console.log("page",page)
     const query={status:"pending"}
     const totalCount=await requestsCollections.countDocuments(query)
      const result=await requestsCollections.find(query).skip((page-1)*12).limit(12).toArray()
      res.send({result,totalCount})
    })

    app.get("/all-blood-req",verifyFirebaseToken,async(req,res)=>{
      const {page}=req.query;
      const totalCount=await requestsCollections.countDocuments()
      const result=await requestsCollections.find().skip((page-1)*10).limit(10).toArray()
      res.send({result,totalCount})
    })

    app.patch("/donate-status",async(req,res)=>{
      const id=req.query.id;
      const filter={_id:new ObjectId(id)}
      const updateedDoc={
        $set:{
          status:"inprogress"
        }
      }
      const result=await requestsCollections.updateOne(filter,updateedDoc);
      res.send(result)
    })

    app.get("/requests-details/:id",verifyFirebaseToken,async(req,res)=>{
      const id=req.params.id;
      console.log("the post id is",id)
      const query={_id:new ObjectId(id)}
      const result=await requestsCollections.findOne(query);
      res.send(result)
    })


    // blog related api
    app.post("/add-blog",async(req,res)=>{
      const newBlog=req.body;
      const result=await blogsCollection.insertOne(newBlog);
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
