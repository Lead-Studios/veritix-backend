import bcrypt from "bcrypt";
const jwt = require("jsonwebtoken");
const { getRepository } = require("typeorm");
const User = require("../models/User");

const generateToken = (user) => jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const userRepo = getRepository(User);
    const existingUser = await userRepo.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = userRepo.create({ name, email, password: hashedPassword });
    await userRepo.save(newUser);

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userRepo = getRepository(User);
    const user = await userRepo.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user);
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
