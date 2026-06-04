import express from "express";
const schedulingRouter = express.Router();
import {
  getAvailability,
  createCheckout,
  getMetrics,
  getBookingStatsByEmail,
  getAvailabilitySettings,
  createAvailabilitySetting,
  updateAvailabilitySetting,
  deleteAvailabilitySetting,
  createSchedulingInvite,
  getSchedulingInvite,
  getManageableMeetings,
  cancelMeeting,
  rescheduleMeeting,
  uploadBookingAttachment,
} from "../controller/scheduling-controller.js";
import { schedulingUploadMiddleware } from "../middleware/schedulingUpload.js";

schedulingRouter.get("/get-availability", getAvailability);
schedulingRouter.get("/metrics", getMetrics);
schedulingRouter.get("/booking-stats", getBookingStatsByEmail);
schedulingRouter.get("/availability-settings", getAvailabilitySettings);
schedulingRouter.get("/invites/:id", getSchedulingInvite);
schedulingRouter.get("/meetings", getManageableMeetings);

schedulingRouter.post("/checkout", createCheckout);
schedulingRouter.post("/booking-uploads", (req, res, next) => {
  schedulingUploadMiddleware(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File is too large. Maximum size is 10 MB." });
      }
      return res.status(400).json({ message: err.message || "Upload failed" });
    }
    return uploadBookingAttachment(req, res, next);
  });
});
schedulingRouter.post("/invites", createSchedulingInvite);
schedulingRouter.post("/availability-settings", createAvailabilitySetting);
schedulingRouter.post("/meetings/:id/cancel", cancelMeeting);
schedulingRouter.put("/availability-settings/:id", updateAvailabilitySetting);
schedulingRouter.patch("/meetings/:id/reschedule", rescheduleMeeting);
schedulingRouter.delete("/availability-settings/:id", deleteAvailabilitySetting);



export default schedulingRouter;