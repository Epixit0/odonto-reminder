import mongoose, { Schema } from "mongoose";

const PatientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true, index: true },
    language: { type: String, enum: ["es", "en", "pap"], default: "es" },
    email: { type: String, trim: true },
    notes: { type: String, trim: true },
    totalVisits: { type: Number, default: 0 },
    lastVisitDate: { type: Date },
    nextAppointmentDate: { type: Date },
    firstContactDate: { type: Date },
    tags: [{ type: String, trim: true }],
    lastActivity: { type: Date },
  },
  { timestamps: true },
);

PatientSchema.index({ name: "text", phone: "text" });

export default mongoose.models.Patient ||
  mongoose.model("Patient", PatientSchema);
