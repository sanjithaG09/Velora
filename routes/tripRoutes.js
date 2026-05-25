const express = require("express");
const router = express.Router();
 
const auth = require("../middleware/auth");
const {
    saveTrip,
    getTrips,
    getTrip,
    deleteTrip,
    updateTrip,
    duplicateTrip,
    shareTrip,
    getSharedTrip,
} = require("../controllers/tripController");

router.post("/save-trip", auth, saveTrip);
router.get("/trips", auth, getTrips);               // supports ?city= &from= &to=
router.get("/trip/:id", auth, getTrip);             // single trip + weather
router.delete("/trip/:id", auth, deleteTrip);
router.put("/trip/:id", auth, updateTrip);
router.post("/trip/:id/duplicate", auth, duplicateTrip);
router.post("/trip/:id/share", auth, shareTrip);    // mark trip as publicly shareable
router.get("/shared/:id", getSharedTrip);           // public — no auth required
 
module.exports = router;