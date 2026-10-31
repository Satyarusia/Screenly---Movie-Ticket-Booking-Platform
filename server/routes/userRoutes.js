const express = require("express");
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword,
  getFavourites,
  addFavourite,
  removeFavourite,
  getAllUsers,
  deleteUser,
} = require("../controllers/userController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// All user routes require authentication
router.use(protect);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/change-password", changePassword);

// Favourites
router.get("/favourites", getFavourites);
router.post("/favourites/:movieId", addFavourite);
router.delete("/favourites/:movieId", removeFavourite);

// Admin user management
router.get("/", adminOnly, getAllUsers);
router.delete("/:id", adminOnly, deleteUser);

module.exports = router;
