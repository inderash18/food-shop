import { Schema, model, models, Types, Model } from 'mongoose';

export interface ISeatLayoutItem {
  row: string;
  number: number;
  label: string;
  type: 'STANDARD' | 'PREMIUM' | 'VIP';
  price: number;
}

export interface ITimeSlot {
  time: string;
  label: string;
  totalSeats: number;
  availableSeats: number;
}

export interface IEvent {
  _id: Types.ObjectId;
  title: string;
  category: 'Auditorium' | 'Dining Lounge' | 'Theatre' | 'Campus Bistro' | 'Study Pods';
  venue: string;
  tagline: string;
  description: string;
  bannerImage: string;
  startingPrice: number;
  durationMinutes: number;
  dates: string[];
  timeSlots: ITimeSlot[];
  seatLayout: ISeatLayoutItem[];
  collectionCounter: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const seatLayoutItemSchema = new Schema<ISeatLayoutItem>(
  {
    row: { type: String, required: true },
    number: { type: Number, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['STANDARD', 'PREMIUM', 'VIP'], default: 'STANDARD' },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const timeSlotSchema = new Schema<ITimeSlot>(
  {
    time: { type: String, required: true },
    label: { type: String, required: true },
    totalSeats: { type: Number, required: true, default: 36 },
    availableSeats: { type: Number, required: true, default: 36 },
  },
  { _id: false }
);

const eventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, index: true },
    category: {
      type: String,
      enum: ['Auditorium', 'Dining Lounge', 'Theatre', 'Campus Bistro', 'Study Pods'],
      required: true,
      index: true,
    },
    venue: { type: String, required: true },
    tagline: { type: String, required: true },
    description: { type: String, required: true },
    bannerImage: { type: String, required: true },
    startingPrice: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, required: true, default: 90 },
    dates: { type: [String], required: true },
    timeSlots: { type: [timeSlotSchema], required: true },
    seatLayout: { type: [seatLayoutItemSchema], required: true },
    collectionCounter: { type: String, required: true, default: 'Counter 2 - Express Pick' },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const Event = (models.Event ?? model<IEvent>('Event', eventSchema)) as Model<IEvent>;
