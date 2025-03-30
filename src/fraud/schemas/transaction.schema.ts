import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document } from "mongoose"

@Schema({ timestamps: true })
export class Transaction extends Document {
  @Prop({ required: true })
  transactionId: string

  @Prop({ required: true })
  userId: string

  @Prop({ required: true })
  ip: string

  @Prop({ type: Object, required: true })
  cardDetails: {
    last4: string
    bin: string
  }

  @Prop({ required: true })
  amount: number

  @Prop({ required: true })
  ticketCount: number

  @Prop({ required: true })
  eventId: string

  @Prop({ required: true })
  timestamp: Date

  @Prop()
  userAgent?: string

  @Prop()
  deviceId?: string
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction)

