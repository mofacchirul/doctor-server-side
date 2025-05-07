const express = require("express");
require("dotenv").config();
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.BD_USER}:${process.env.BD_PASSWORD}@cluster0.98tazfb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
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

    app.get("/alldoctor", async (req, res) => {
      const result = await All_doctor.find().toArray();
      res.send(result);
    });
    app.get("/alldoctor/:id",async(req,res)=>{
      const id = req.params.id;
      const query = {_id:new ObjectId(id)};
      const result = await All_doctor.findOne(query);
      res.send(result)
    })


    app.post("/Appointment ", async (req, res) => {
      const data = req.body;
      const result = await Appointment_collections.insertOne(data);
      res.send(result);
    });








    console.log("Connected to MongoDB!");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
  }
}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
  })
  
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })

