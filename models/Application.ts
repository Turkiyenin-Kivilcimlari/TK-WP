import mongoose, { Schema, Document } from 'mongoose';

export enum ApplicationStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DELETED = 'deleted'
}

export interface IApplication extends Document {
  userId: mongoose.Types.ObjectId;
  schoolName?: string;
  contactInfo?: string;
  emailAddress?: string;
  socialMedia?: string[];
  linkedinUrl?: string;
  department?: string;
  grade?: string;
  contactChannel?: string;
  additionalInfo?: string;
  experience?: string;
  skillsOrResources?: string;
  communityVision?: string;
  communityExpectation?: string;
  status: ApplicationStatus;
  isDraft?: boolean;
  adminNotes?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema: Schema = new Schema(
  {
    // User info
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    
    // Application fields
    schoolName: { type: String },
    contactInfo: { type: String },
    emailAddress: { type: String },
    socialMedia: [{ type: String }],
    linkedinUrl: { type: String },
    department: { type: String },
    grade: { type: String },
    contactChannel: { type: String },
    additionalInfo: { type: String },
    experience: { type: String },
    skillsOrResources: { type: String },
    communityVision: { type: String },
    communityExpectation: { type: String },
    
    // Meta fields
    status: { 
      type: String, 
      enum: Object.values(ApplicationStatus), 
      default: ApplicationStatus.PENDING 
    },
    isDraft: { 
      type: Boolean, 
      default: false 
    },
    adminNotes: { type: String },
    updatedBy: { type: String }, // 'user' or 'admin'
    
    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }
);

// Ensure the model hasn't been compiled yet
const Application = mongoose.models.Application || mongoose.model<IApplication>('Application', ApplicationSchema);

export default Application;
