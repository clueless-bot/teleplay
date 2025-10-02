import express from 'express';
import path from 'path';
import {
  createNewChannel,
  channelLogin,
  handleChannelContent,
  handleDeleteContent,
  channelSubscribe,
  channelUnSubscribe,
  handleLatestContent,
  forgotPassword,
  verifyOtp,
  updatePassword,
  handleUpload,
  handleSubscription,
  handleDesub,
  newUpdatePassword,
  getAllChannels,
  searchChannels,
  channelSubscriptions,
  getChannelById,
  getChannelProfile,
  updateChannelProfile,
  getShortLinkById,
  getUploadById,
  handleUpdateUpload,
  handleTorrentStream,
  streamTorrentFile,
  handleGoogleDrive,
  handleDropbox,
  handlePCloud,
  handleIcedrive,
  handleMega
} from './controller/channel.js';

import {
  generateShortLink,
  getMetadata,
  handleStreaming,
  searchTorrents,
  handleShortService,
  handleShortStats,
} from './controller/torrent.js';

import {
  registerNewUser,
  login,
  getUsers,
  authGoogle,
  verifyOtpforPhone,
  sendOtp
} from './controller/user.js';

import upload from './utils/multerConfig.js'; // ✅ new multer import

import { getAdminUploads } from './controller/channel.js';
import { submitFeedback } from "./controller/channel.js";

const router = express.Router();

router.get('/health', (req, res) => res.sendStatus(200));

router.post('/user/register', registerNewUser);
router.post('/user/login', login);
router.get('/users', getUsers);
router.get('/auth/google', authGoogle);
router.get('/auth/google/callback', () => {}); // Fill this out

// Torrent-related routes
router.get('/metadata', getMetadata);
router.get('/stream', handleStreaming);
router.get('/search', searchTorrents);

// File Upload Routes
router.post('/content/uploadPost', upload.single('thumbnail'), handleUpload);


router.get("/s/:code", async (req, res) => {
  try {
    const { code } = req.params;

    // Look up by matching the code inside output_link
    const result = await db.query.uploads.findFirst({
      where: (u, { like }) => like(u.output_link, `%${code}`)
    });

    if (!result) {
      return res.status(404).json({ message: "Short link not found" });
    }

    res.redirect(result.input_link);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


// Short link service
router.post('/generate/short', upload.single('thumbnail'), generateShortLink); // also using multer
router.get('/short/:uid', handleShortService);
router.get('/short/stats/:uid', handleShortStats);

// GET /api/shortlink/:id
router.get("/shortlink/:id", getShortLinkById);


// Channel-related routes
router.patch('/channel/profile', updateChannelProfile);
router.get('/channel/profile', getChannelProfile);
router.get('/content/:channelId', handleChannelContent);
router.get('/latest/content/:channelId', handleLatestContent);
router.delete('/content/:uid', handleDeleteContent);
router.post('/channel/create', createNewChannel);
router.post('/channel/login', channelLogin);
router.get('/channel/all', getAllChannels);
router.post('/channel/subscribe', channelSubscribe);
router.post('/channel/unsubscribe', channelUnSubscribe);
router.post('/channel/forgotpassword', forgotPassword);
router.post('/otpVerification', verifyOtp);
router.patch('/updatePassword', updatePassword);
router.get('/admin/uploads', getAdminUploads);
router.post('/admin/sub', handleSubscription);
router.post('/admin/desub', handleDesub);
router.post("/channel/feedback", submitFeedback);
router.patch('/channel/update-password', newUpdatePassword);


// ✅ search channels & content (GET /api/search?query=word)
router.get("/channel/search", searchChannels);

//  get channel by there id
router.get('/channel/:id', getChannelById);
// routes/channel.js (or wherever your routes are defined)
router.get('/channel/subscriptions/:userId', channelSubscriptions);

// OTP
router.post('/sendOTP', sendOtp); // ✅ POST, 
router.post('/verifyOTP',verifyOtpforPhone)

// router.post('/upload/profile-image', upload.single('file'), (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ message: 'No file uploaded' });
//   }

//   const fileUrl = `http://localhost:9898/uploads/${req.file.filename}`; // Adjust your port if needed
//   res.status(200).json({ url: fileUrl });
// });


router.post("/upload/profile-image", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    const fileUrl = `http://localhost:9898/utils/upload/${req.file.filename}`;
    res.status(200).json({ url: fileUrl });
  } catch (err) {
    console.error(err); // ✅ ab err defined hai
    res.status(500).json({ message: "Something went wrong" });
  }
});



router.get("/channel/profile", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req.headers.authorization); // parse token
    const [user] = await db.select().from(channels).where(eq(channels.user_id, userId));
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
});




router.get('/uploads/:id', getUploadById)

router.patch('/content/uploadPost/:id', upload.single('thumbnail'), handleUpdateUpload);

// router.get('/api/uploads/recent/:adminId', handleRecentUploads);



















// The following api are for Video Streaming

// Main /stream route: decides based on link type
router.all('/stream', async (req, res) => {
  const link = req.body.link || req.query.link;
  if (!link) return res.status(400).json({ error: 'Link is required' });

  try {
    if (link.startsWith('magnet:')) await handleTorrentStream(req, res);
    else if (link.includes('drive.google.com')) await handleGoogleDrive(req, res);
    else if (link.includes('dropbox.com')) await handleDropbox(req, res);
    else if (link.includes('pcloud')) await handlePCloud(req, res);
    else if (link.includes('icedrive')) await handleIcedrive(req, res);
    else if (link.includes('mega.nz')) handleMega(req, res);
    else res.status(400).json({ error: 'Unsupported link type' });
  } catch (error) {
    console.error('Error routing link:', error.message);
    res.status(500).json({ error: 'Failed to process the link' });
  }
});

// Torrent file streaming
router.get('/stream/torrent/:filename', streamTorrentFile);


// Health check
// router.get('/healthForStreaming', (req, res) => {
//   res.status(200).json({ message: 'I am running, happy coding!' });
// });

router.get('/healthForStreaming', (req, res) => res.sendStatus(200));

export default router;
