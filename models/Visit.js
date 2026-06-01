import mongoose, { Schema } from "mongoose";

const VisitSchema = new Schema(
  {
    patientName: { type: String, required: true, trim: true },
    patientPhone: { type: String, required: true, trim: true },
    language: { type: String, enum: ["es", "en", "pap"], default: "es" },
    treatmentType: { type: String, required: true, trim: true },
    treatmentDate: { type: Date, required: true },
    followUpDate: { type: Date, required: true },
    notifyUnit: {
      type: String,
      enum: ["minutes", "days", "weeks", "months"],
      default: "months",
    },
    notifyValue: { type: Number, default: 3, min: 1 },
    sent5dPatient: { type: Boolean, default: false },
    sent2dPatient: { type: Boolean, default: false },
    sent5dOwner: { type: Boolean, default: false },
    sent2dOwner: { type: Boolean, default: false },
    // Campos de confirmación
    confirmationStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    patientResponse: { type: String, trim: true },
    respondedAt: { type: Date },
    patientChatId: { type: String, trim: true }, // ID de WhatsApp del chat
  },
  { timestamps: true },
);

export default mongoose.models.Visit || mongoose.model("Visit", VisitSchema);
