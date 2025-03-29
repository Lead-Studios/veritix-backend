import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document } from "mongoose"

@Schema({ timestamps: true })
export class FraudLog extends Document {
  @Prop({ required: true })
  transactionId: string

  @Prop({ required: true })
  userId: string

  @Prop({ required: true })
  riskScore: number

  @Prop({ required: true, enum: ["approve", "flag", "block"] })
  action: string

  @Prop({ type: [String], default: [] })
  flags: string[]

  @Prop({ required: true })
  timestamp: Date
}

export const FraudLogSchema = SchemaFactory.createForClass(FraudLog)

