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



// console.log("Stripe key is:", process.env.STRIPE_SECRET_KEY); 

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
  //  console.log(authHeader)
   
   if(!authHeader || !authHeader.startsWith('Bearer ')){
    return res.status(401).send({message: "Unauthorized Access"})
   }

   
   
   
   const token=authHeader.split(" ")[1];
  //  console.log(token)

   
   if(!token){
    return res.status(401).send({message: "Unauthorized Access"})
   }
     
   

   


   try{
    const decoded=await admin.auth().verifyIdToken(token)
    req.decoded=decoded;
    // console.log("decoded token",req.decoded.email)
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
  // console.log(newFund)
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
      // console.log("user role email",email)
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


    app.put("/user/profile",verifyFirebaseToken,async(req,res)=>{
      const email=req.decoded.email;
      const updatedData=req.body;
      // console.log(email,updatedData)
       const options = { upsert: true };
      const filter={email:email}
      const updatedDoc={
        $set:updatedData
      }
      const result=await usersCollections.updateOne(filter,updatedDoc,options)
      res.send(result)

    })

    app.get("/all-users",async(req,res)=>{
      const {bloodGroup,divisionName,districtName,upazilaName}=req.query;
      // console.log(bloodGroup,divisionName,districtName,upazilaName)
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


    // users blck unblock and role change
    app.patch("/users/block/:id",verifyFirebaseToken,verifyAdmin,async(req,res)=>{
      const id=req.params.id;
      const filter={_id : new ObjectId(id)};
      const updatedDoc={
        $set:{
          status:"blocked"
        }
      }
      const result=await usersCollections.updateOne(filter,updatedDoc);
      res.send(result)
    })
    // unblock
    app.patch("/users/unblock/:id",verifyFirebaseToken,verifyAdmin,async(req,res)=>{
      const id=req.params.id;
      const filter={_id : new ObjectId(id)};
      const updatedDoc={
        $set:{
          status:"active"
        }
      }
      const result=await usersCollections.updateOne(filter,updatedDoc);
      res.send(result)
    })

    // unblock
    app.patch("/users/role/:id",verifyFirebaseToken,verifyAdmin,async(req,res)=>{
      const id=req.params.id;
      const {role}=req.body;

      const filter={_id : new ObjectId(id)};
      const updatedDoc={
        $set:{
          role:role
        }
      }
      const result=await usersCollections.updateOne(filter,updatedDoc);
      res.send(result)
    })


    app.get("/total",verifyFirebaseToken,async(req,res)=>{
      const totalUsers=await usersCollections.countDocuments({role:"donor"})

      const totalRequests=await requestsCollections.countDocuments()

      // const activity=await requestsCollections.find().sort({createdAt:-1}).limit(3).toArray()

      const total=await fundingsCollection.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" }
        }
      }
    ]).toArray();

     const totalFunding = total[0]?.totalAmount || 0;

     const fundingData=await fundingsCollection.find().toArray()
     const requestsData=await requestsCollections.find().toArray()

    // console.log("total fund",totalFunding)
      res.send({totalUsers,totalFunding,totalRequests, fundingData,requestsData})
    })



    // request related api
    app.post("/donation-requests",async(req,res)=>{
      const newRequest=req.body;
      const result=await requestsCollections.insertOne(newRequest);
      res.send(result)
    })



    app.get("/my-requests",verifyFirebaseToken,async(req,res)=>{
      const {page}=req.query;
      const email=req.decoded.email;
      const query={requesterEmail: email}
      const totalCount=await requestsCollections.countDocuments(query)
      const result=await requestsCollections.find(query).skip((page-1)*10).limit(10).toArray();
      res.send({result,totalCount})
    })

    app.delete("/delete-request/:id",verifyFirebaseToken,async(req,res)=>{
      const {id}=req.params;
      // console.log("deleted id",id)
      const filter={_id: new ObjectId(id)};
      const result=await requestsCollections.deleteOne(filter);
      res.send(result)
    })


    app.get("/all-requests",async(req,res)=>{
      const {page}=req.query;
      // console.log("page",page)
     const query={status:"pending"}
     const totalCount=await requestsCollections.countDocuments(query)
      const result=await requestsCollections.find(query).skip((page-1)*12).limit(12).toArray()
      res.send({result,totalCount})
    })

    app.get("/all-blood-req",verifyFirebaseToken,async(req,res)=>{
      const {page,status,text}=req.query;
      const query={}
      if(status){
        query.status=status;
      }
      if(text){
        query.recipientName= { $regex:text, $options: "i" };
      }

      const totalCount=await requestsCollections.countDocuments()
      const result=await requestsCollections.find(query).skip((page-1)*10).limit(10).toArray()
      res.send({result,totalCount})
    })

    app.patch("/donate-status",async(req,res)=>{
      const id=req.query.id;
      const donor=req.body;
      // console.log("donor",donor)
      const filter={_id:new ObjectId(id)}
      const updateedDoc={
        $set:{
          status:"inprogress",
          donor:donor
        }
      }
      const result=await requestsCollections.updateOne(filter,updateedDoc);
      res.send(result)
    })

    app.get("/requests-details/:id",verifyFirebaseToken,async(req,res)=>{
      const id=req.params.id;
      // console.log("the post id is",id)
      const query={_id:new ObjectId(id)}
      const result=await requestsCollections.findOne(query);
      res.send(result)
    })


    app.put("/donation-requests/:id",verifyFirebaseToken,async(req,res)=>{
      const id=req.params.id;
      const updatedData=req.body;
      const filter={_id: new ObjectId(id)};
         const options = { upsert: true };
      const updatedDoc={
        $set:updatedData
      }

      const result=await requestsCollections.updateOne(filter,updatedDoc,options)
      res.send(result)
    })


    app.patch("/update-req-status/:id",verifyFirebaseToken,async(req,res)=>{
      const id=req.params.id;
      const {status}=req.body;
      const filter={_id: new ObjectId(id)};
      const updatedDoc={
        $set:{
          status:status
        }
      }
      const result= await requestsCollections.updateOne(filter,updatedDoc);
      res.send(result)
    })


    // donor api

       app.get("/donor-rec",verifyFirebaseToken,async(req,res)=>{
        const email=req.decoded.email;
        const query={requesterEmail:email};
        const result=await requestsCollections.find(query).sort({createdAt:-1}).limit(3).toArray()
        res.send(result)
       })  
    // donor api end


    // blog related api
    app.post("/add-blog",async(req,res)=>{
      const newBlog=req.body;
      const result=await blogsCollection.insertOne(newBlog);
      res.send(result)
    })



   app.get("/all-blogs",verifyFirebaseToken,async(req,res)=>{
    const {statusFilter,searchText}=req.query;

    // console.log("contant manage",searchText,statusFilter)

    const query={}

    if(statusFilter){
      query.status=statusFilter
    }

    if(searchText){
       query.title= { $regex:searchText, $options: "i" };
    }
    const result = await blogsCollection.find(query).toArray()
    res.send(result)
   })

   app.get("/public-blogs",async(req,res)=>{
    const query={status:"published"};
    const result=await blogsCollection.find(query).toArray()
    res.send(result)
   })

   app.delete("/blogs/:id",verifyFirebaseToken,verifyAdmin,async(req,res)=>{
    const id=req.params.id;
    const filter={_id: new ObjectId(id)};
    const result=await blogsCollection.deleteOne(filter)
    res.send(result)
   })

   app.patch("/blogs/status/:id",verifyFirebaseToken,verifyAdmin,async(req,res)=>{
    const id=req.params.id;
    const {status}=req.body;
    const filter={_id: new ObjectId(id)}
    const updatedDoc={
      $set:{
        status:status
      }
    }
    const result =await blogsCollection.updateOne(filter,updatedDoc)
    res.send(result)
   })


   app.get("/blog/:id",async(req,res)=>{
    const {id}=req.params;
    const query={_id:new ObjectId(id)}
    const result =await blogsCollection.findOne(query)
    res.send(result)
   })
   
   app.put("/blogs/:id",verifyFirebaseToken,verifyAdmin,async(req,res)=>{
    const {id}=req.params;
    const updatedData=req.body;
     delete updatedData._id;
    const filter={_id :new ObjectId(id)};
    const options = { upsert: true };
      const updatedDoc={
        $set:updatedData
      }

      const result=await blogsCollection.updateOne(filter,updatedDoc,options);
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
