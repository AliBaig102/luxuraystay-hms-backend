import mongoose, { Schema, Document } from 'mongoose';
import {
  MaintenanceRequest,
  MaintenanceCategory,
  TaskStatus,
  Priority,
} from '../types/models';

export interface MaintenanceRequestDocument
  extends MaintenanceRequest,
    Document {
  age: number;
  isOverdue: boolean;
  completionTime: number | null;
  urgencyScore: number;
}

const maintenanceRequestSchema = new Schema(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      enum: Object.values(MaintenanceCategory),
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    priority: {
      type: String,
      enum: Object.values(Priority),
      default: Priority.MEDIUM,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.PENDING,
      required: true,
    },
    assignedTechnicianId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    estimatedCompletionDate: {
      type: Date,
    },
    actualCompletionDate: {
      type: Date,
    },
    cost: {
      type: Number,
      min: [0, 'Cost cannot be negative'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for better query performance
maintenanceRequestSchema.index({ roomId: 1 });
maintenanceRequestSchema.index({ reportedBy: 1 });
maintenanceRequestSchema.index({ category: 1 });
maintenanceRequestSchema.index({ priority: 1 });
maintenanceRequestSchema.index({ status: 1 });
maintenanceRequestSchema.index({ assignedTechnicianId: 1 });
maintenanceRequestSchema.index({ createdAt: -1 });

// Compound indexes for common queries
maintenanceRequestSchema.index({ status: 1, priority: 1 });
maintenanceRequestSchema.index({ assignedTechnicianId: 1, status: 1 });
maintenanceRequestSchema.index({ category: 1, status: 1 });
maintenanceRequestSchema.index({ priority: 1, createdAt: 1 });

// Virtual for request age
maintenanceRequestSchema.virtual('age').get(function () {
  const diffTime = Math.abs(
    new Date().getTime() - (this as any).createdAt.getTime()
  );
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Age in days
});

// Virtual for overdue status
maintenanceRequestSchema.virtual('isOverdue').get(function () {
  if (
    (this as any).estimatedCompletionDate &&
    (this as any).status !== TaskStatus.COMPLETED
  ) {
    return new Date() > (this as any).estimatedCompletionDate;
  }
  return false;
});

// Virtual for completion time
maintenanceRequestSchema.virtual('completionTime').get(function () {
  if ((this as any).createdAt && (this as any).actualCompletionDate) {
    const diffTime =
      (this as any).actualCompletionDate.getTime() -
      (this as any).createdAt.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60)); // Time in hours
  }
  return null;
});

// Virtual for urgency score
maintenanceRequestSchema.virtual('urgencyScore').get(function () {
  let score = 0;

  // Priority score
  switch ((this as any).priority) {
    case Priority.URGENT:
      score += 10;
      break;
    case Priority.HIGH:
      score += 7;
      break;
    case Priority.MEDIUM:
      score += 4;
      break;
    case Priority.LOW:
      score += 1;
      break;
  }

  // Age score (older requests get higher score)
  score += Math.min((this as any).age, 30);

  return score;
});

// Ensure virtual fields are serialized
maintenanceRequestSchema.set('toJSON', {
  virtuals: true,
});

export const MaintenanceRequestModel =
  mongoose.model<MaintenanceRequestDocument>(
    'MaintenanceRequest',
    maintenanceRequestSchema
  );
