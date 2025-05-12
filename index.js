require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_KEY);
app.use(
  cors({
    origin:[
      "http://localhost:5173",
      "https://doctors-f203b.firebaseapp.com",
      "https://doctors-f203b.web.app"
      
    ] ,
    credentials: true,
  })
);
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.BD_USER}:${process.env.BD_PASSWORD}@cluster0.98tazfb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    
    const All_doctor = client.db("Doctor").collection("All_Doctor");
    const Appointment_collections = client
      .db("Doctor")
      .collection("Appointment");
    const user_collections = client.db("Doctor").collection("user");
    const blog_collections = client.db("Doctor").collection("blog");
    const payment_collections = client.db("Doctor").collection("payment");

    // jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // Middleware: verifyToken
    const verifyToken = (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader)
        return res.status(403).send("Forbidden: No token provided");

      const token = authHeader.split(" ")[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) return res.status(403).send("Forbidden: Invalid token");
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await user_collections.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    app.post("/alldoctor", async (req, res) => {
      const data = req.body;
      const result = await All_doctor.insertOne(data);
      res.send(result);
    });

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

    app.get("/appointment", async (req, res) => {
      const email = req.query.email;

      const query = { email: email };
      const result = await Appointment_collections.find(query).toArray();
      res.send(result);
    });

    app.delete("/appointment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await Appointment_collections.deleteOne(query);
      res.send(result);
    });

    //  user
    app.post("/user", async (req, res) => {
      const data = req.body;
      const result = await user_collections.insertOne(data);
      res.send(result);
    });

    app.get("/user", verifyToken, verifyAdmin, async (req, res) => {
      const result = await user_collections.find().toArray();
      res.send(result);
    });

    app.delete("/user/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await user_collections.deleteOne(query);
      res.send(result);
    });
    app.get("/user/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const user = await user_collections.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.patch("/user/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await user_collections.updateOne(filter, updateDoc);
      res.send(result);
    });

    // blog
    app.post("/blog", async (req, res) => {
      const data = req.body;
      const result = await blog_collections.insertOne(data);
      res.send(result);
    });

    app.get("/blog", async (req, res) => {
      const result = await blog_collections.find().toArray();
      res.send(result);
    });

    app.post("/create-checkout-session", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    app.post("/payment", async (req, res) => {
      const data = req.body;
      const result = await payment_collections.insertOne(data);

      const query = {
        _id: {
          $in: data.appointmentIds.map((id) => new ObjectId(id)),
        },
      };

      const deleteresult = await Appointment_collections.deleteMany(query);
      res.send({ result, deleteresult });
    });

    app.get("/payment", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await payment_collections.find(query).toArray();
      res.send(result);
    });
    app.get("/payments",  async (req, res) => {
      const result = await payment_collections.find().toArray();
      res.send(result);
    });

    app.get("/admin-stats", async (req, res) => {
      const user = await user_collections.estimatedDocumentCount();
      const doctors = await All_doctor.estimatedDocumentCount();
      const blog = await blog_collections.estimatedDocumentCount();
      const appointment =
        await Appointment_collections.estimatedDocumentCount();
      const payments = await payment_collections
        .aggregate([
          {
            $group: {
              _id: null,
              totalRevenue: {
                $sum: "$price",
              },
            },
          },
        ])
        .toArray();
      const revenue = payments.length > 0 ? payments[0].totalRevenue : 0;
      res.send({ user, doctors, blog, appointment, revenue });
    });

    
  } catch (error) {
    console.error("MongoDB connection failed:", error);
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
