const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const User = require("./models/user");
const Order = require("./models/order");
const bcrypt = require("bcrypt");
const app = express();
const port = 8000;
app.use(bodyParser.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));


async function sendVerificationEmail(email, token) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "shibaprasadmallick0@gmail.com",
      pass: "nhhx libh uxef acwb",
    },
  });
  const mailOptions = {
    from: "amazon.com",
    to: email,
    subject: "Email Verification",
    text: `<p>Please click the following link to verify your email:http://localhost:8000/verify/${token}">Verify Email</a>`,
  };
  await transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}

app.post("/register", async (req, res) => {
  try {
    //password required
    const { name, email,password } = req.body;
    //check if email is already registerd
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }
    //create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });

    newUser.verificationToken = crypto.randomBytes(20).toString("hex");
    await newUser.save();

    //send verification email
    sendVerificationEmail(newUser.email, newUser.verificationToken);
    res.status(201).json({ message: "User registered successfully", newUser });
    console.log("user registered successfully");
  } catch (err) {
    console.log("error registering user", err);
    res.status(500).json({ message: "error registering user" });
  }
});

//login
function generateSecretKey() {
  return crypto.randomBytes(32).toString("hex");
}
const secretKey = generateSecretKey(); //replace with your own secret key

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    if (!user.verified) {
      return res.status(400).json({ message: "Email not verified" });
    }

    // if (user.password !== password) {
    //   return res.status(400).json({ message: "Invalid  email or password" });
    // }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    const token = jwt.sign({ id: user._id }, secretKey);
    res.status(200).json({ message: "Login successful", token });
    console.log("login succsefull", token);
  } catch (err) {
    console.log("error logging in", err);
    res.status(500).json({ message: "error logging in" });
  }
});

app.post("/forgotPassword", async (req, res) => {
  const { email, newPassword } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: "Invalid email " });
  }
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save();
  res.status(200).json({ message: "password changed successfully", user });
  console.log("password changed successfully");
});

app.post("/updatePassword", async (req, res) => {
  const { email, newPassword,password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: "Invalid email " });
  }
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(400).json({ message: "Invalid  password" });
  }
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save();
  res.status(200).json({ message: "password updated successfully", user });
  console.log("password updated successfully");
});

//endpoint store new address

app.post("/address", async (req, res) => {
  try {
    const { userId, address } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.addresses.push(address);
    await user.save();
    res.status(200).json({ message: "Address saved successfully" });
  } catch (err) {
    console.log("error saving address", err);
    res.status(500).json({ message: "error saving address" });
  }
});

//endpoint to get all addresses of perticular user

app.get("/addresses/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ addresses: user.addresses });
  } catch (err) {
    console.log("error getting addresses", err);
    res.status(500).json({ message: "error getting addresses" });
  }
});

app.post("/orders", async (req, res) => {
  try {
    const { userId, cartItems, shippingAddress, paymentMethod, totalPrice } =
      req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    //create an array of product obj from cart items

    const products = cartItems.map((item) => ({
      name: item.title,
      price: item.price,
      image: item.image,
      quantity: item.quantity,
    }));

    //create new order
    const order = new Order({
      user: userId,
      products,
      shippingAddress,
      paymentMethod,
      totalPrice: totalPrice,
    });
    user.orders.push(order);
    let value = await order.save();
    console.log("order value", value);
    res.status(200).json({ message: "Order created successfully", order });
    console.log("order created successfully");
  } catch (err) {
    console.log("error creating orders", err);
    res.status(500).json({ message: "error creating orders" });
  }
});

app.get("/profile/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user });
  } catch (err) {
    console.log("error getting user", err);
    res.status(500).json({ message: "error getting user" });
  }
});

app.get("/orders/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const orders = await Order.find({ user: userId });
    res.status(200).json({ orders });
  } catch (err) {
    console.log("error getting orders", err);
    res.status(500).json({ message: "error getting orders" });
  }
});

//endpoint to verify the email
app.get("/verify/:token", async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });
    if (!user) {
      return res.status(400).json({ message: "Invalid token" });
    }
    user.verified = true;
    user.verificationToken = undefined;
    await user.save();
    res.status(200).json({ message: "Email verified successfully" });
  } catch (err) {
    console.log("error verifying email", err);
    res.status(500).json({ message: "error verifying email" });
  }
});

mongoose
  .connect("mongodb+srv://rpshiba2:rpshiba2@cluster0.4qqa7mx.mongodb.net/ ", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log(`connected to mongoDB`);
  })
  .catch((err) => {
    console.log("Error Connecting to mongoDB", err);
  });

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
