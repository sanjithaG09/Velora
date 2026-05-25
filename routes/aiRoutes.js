const express = require("express");
const router = express.Router();
const { generateItinerary, generateItineraryFast, generateItineraryStream, getDateSuggestion, parseSearch, chatStream } = require("../controllers/aiController");

router.post("/ai/itinerary", generateItinerary);
router.post("/ai/itinerary/fast", generateItineraryFast);
router.post("/ai/itinerary/stream", generateItineraryStream);
router.post("/ai/chat/stream", chatStream);
router.post("/ai/date-suggestion", getDateSuggestion);
router.post("/ai/search", parseSearch);

module.exports = router;
