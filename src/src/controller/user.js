import dotenv from 'dotenv';
import path from 'path';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import process from 'process';
import Queries from '../database/queries.js';
import { EmailJSResponseStatus, send } from '@emailjs/nodejs';
import { log } from 'console';

dotenv.config({
  path: path.join(process.cwd(), '.env'),
});

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI = 'http://localhost:9898/auth/google/callback'

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
if (JWT_SECRET_KEY === undefined) {
  throw new Error('JWT_SECRET NOT FOUND');
}
const otpStore = new Map();
export async function registerNewUser(req, res) {
  try {
    const { email, password, name, phoneNumber } = req.body;
    console.log('Incoming registration:', req.body);

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Fill all required fields' });
    }

    const existingUser = await Queries.doesEmailAlreadyExists(email);
    if (existingUser.length) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');

    
    // if (existingUser.length) {
    //   return res.status(409).json({ message: 'Email Already Exists' });
    // }
    const storedOtp = otpStore.get(email);


    const registeredUser = await Queries.addNewUserToDB(
      email,
      name,
      hashedPassword,
      phoneNumber,
      storedOtp
    );

    if (!registeredUser) {
      return res.status(500).json({ message: 'Adding user to DB was unsuccessful!' });
    }

    console.log(registeredUser);
    
    const payload = {
      userId: registeredUser.id,
      email: registeredUser.email,
    };

    const token = jwt.sign(payload, JWT_SECRET_KEY || 'fallbackSecretKey');

    res.status(201).json({
      message: 'User registered successfully',
      token,
      channel: registeredUser,
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}






export async function sendOtp(req, res) {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const templateParams = {
    to_email: email,
    otp: otp,
  };

  try {
    const result = await send(
      'service_1ejgjq5',        // Replace with real values
      'template_rx09ox7',
      templateParams,
      {
        publicKey: 'ri8AuW97Rs3Q0wmRc',
        privateKey: 'htcXRCUiXECAZJIHesDni',
      }
    );

    console.log("✅ OTP sent successfully:", result.status);
        otpStore.set(email, otp); // ✅ Store OTP in memory

    res.status(200).json({ message: 'OTP sent successfully' }); // Don't send OTP in response
    return otp;
  } catch (error) {
    console.error('❌ Error sending OTP:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
}


export async function verifyOtpforPhone(req, res) {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  const storedOtp = otpStore.get(email);

  if (!storedOtp) {
    return res.status(404).json({ message: "No OTP found for this email" });
  }

  if (storedOtp === otp) {
    // otpStore.delete(email); // ✅ Remove OTP once verified
    console.log("verified")
    return res.status(200).json({ message: "OTP verified successfully" });
  } else {
    return res.status(401).json({ message: "Invalid OTP" });
  }
}



export async function login(req, res) {
  console.log("login request")
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(404).send('Fill all required fields');
    return;
  }

  try {
    const hashedPassword = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');

    const existingUser = await Queries.findUserWithEmail(email);
    if (!existingUser) {
      res.status(404).send('User does not exist');
      return;
    }

    if (existingUser.password !== hashedPassword) {
      res.status(404).send('Email or password is incorrect');
      return;
    }

    const payload = {
      userId: existingUser.id,
      email: existingUser.email,
    };
    console.log(payload);
    const token = jwt.sign(payload, JWT_SECRET_KEY || "fallbackSecretKey");

    console.log("Generated token:", token);

    res.status(200).json({
      token: token,             // ✅ Fix: Include token here
      name: existingUser.name, // ✅ Send name directly
      channel: existingUser,    // Optional: Include user data
    });
    console.log("✅ Login successful, response sent");

  } catch (error) {
    console.log(error);
    res.status(500).send('Something went wrong');
  }
}


export async function getUsers(req, res) {
  const users = await Queries.getAllUsers()
  if (!users?.length) {
    res.status(400).json({ message: "no user found" })
    return
  }

  res.status(200).json({ users: users })
}

export async function authGoogle(req, res) {
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=profile email`;

  res.redirect(url)
}

export async function authGoogleCallback(req, res) {
  const { code } = req.query;

  try {
    const { data } = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    });

    const { access_token, id_token } = data;

    const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    console.log(profile)

    res.redirect('/');
  } catch (error) {
    console.error('Error:', error.response.data.error);
    res.redirect('/login');
  }
}