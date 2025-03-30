import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document } from "mongoose"

@Schema({ timestamps: true })
export class FraudRule extends Document {
  @Prop({ required: true, unique: true })
  id: string

  @Prop({ required: true })
  name: string

  @Prop({ required: true })
  description: string

  @Prop({ required: true, default: true })
  enabled: boolean

  @Prop({ required: true })
  threshold: number

  @Prop({ required: true })
  weight: number

  @Prop({ required: true, enum: ["flag", "block"] })
  action: string
}

export const FraudRuleSchema = SchemaFactory.createForClass(FraudRule)

