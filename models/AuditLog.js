import mongoose, { Schema } from "mongoose";

const AuditLogSchema = new Schema(
  {
    userId: { type: String, trim: true },
    username: { type: String, trim: true },
    action: {
      type: String,
      enum: [
        "create", "update", "delete",
        "confirm", "cancel",
        "login", "login_failed", "logout",
        "send_test", "send_reminder",
        "export_csv",
      ],
      required: true,
    },
    resource: {
      type: String,
      enum: ["patient", "visit", "user", "config", "auth"],
      required: true,
    },
    resourceId: { type: Schema.Types.ObjectId },
    details: { type: Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true },
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1 });
AuditLogSchema.index({ action: 1 });

export default mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
