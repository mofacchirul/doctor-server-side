const express = require("express");
require("dotenv").config();
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_KEY)
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.BD_USER}:${process.env.BD_PASSWORD}@cluster0.98tazfb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    const All_doctor = client.db("Doctor").collection("All_Doctor");
    const Appointment_collections = client.db("Doctor").collection("Appointment");
    const user_collections = client.db("Doctor").collection("user");
    const blog_collections = client.db("Doctor").collection("blog");
    const payment_collections = client.db("Doctor").collection("payment");
  
    app.post("/alldoctor",async(req,res)=>{
      const data = req.body;
      const result = await All_doctor.insertOne(data);
      res.send(result)
    })


    app.get("/alldoctor", async (req, res) => {
      const result = await All_doctor.find().toArray();
      res.send(result);
    });

    app.get("/alldoctor/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await All_doctor.findOne(query);
      res.send(result);
    });

           
    //  appointment 

    app.post("/appointment", async (req, res) => {
      const data = req.body;
      const result = await Appointment_collections.insertOne(data);
      res.send(result);
    });


    app.get('/appointment',async(req,res)=>{
      const email = req.query.email;

      const query= {email:email}
      const result = await Appointment_collections.find(query).toArray();
        res.send(result);
    })



    app.delete('/appointment/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result =await Appointment_collections.deleteOne(query);
      res.send(result)
    })



      //  user
      app.post('/user',async(req,res)=>{
        const data= req.body;
        const result = await user_collections.insertOne(data)
        res.send(result)
      })
        
      app.get("/user", async (req, res) => {
        const result = await user_collections.find().toArray();
        res.send(result);
      });

      app.delete('/user/:id',async(req,res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result =await user_collections.deleteOne(query);
        res.send(result)
      })


// blog
app.post('/blog',async(req,res)=>{
  const data= req.body;
  const result = await blog_collections.insertOne(data)
  res.send(result)
})
  

app.get("/blog", async (req, res) => {
  const result = await blog_collections.find().toArray();
  res.send(result);
});



app.post('/create-checkout-session', async (req, res) => {
  const {price}=req.body;
  const amount = parseInt(price*100);
  console.log(amount);
  
  const paymentIntent = await stripe.paymentIntents.create({
      amount:amount,
      currency:"usd",
      payment_method_types:['card']
  })
  res.send({clientSecret:paymentIntent.client_secret})
})


app.post('/payment', async (req, res) => {
  const data = req.body;
  const result = await payment_collections.insertOne(data);

  const query = {
    _id: {
      $in: data.appointmentIds.map(id => new ObjectId(id))
    }
  };

  const deleteresult = await Appointment_collections.deleteMany(query);
  res.send({ result, deleteresult });
});



app.get('/payment',async(req,res)=>{
  const email = req.query.email;
  const query= {email:email}
  const result = await payment_collections.find(query).toArray();
    res.send(result);
})








    console.log("Connected to MongoDB!");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
