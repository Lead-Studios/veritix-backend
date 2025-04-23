import { Injectable } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import type { Model } from "mongoose"
import { v4 as uuidv4 } from "uuid"
import { Transaction } from "./schemas/transaction.schema"
import { FraudLog } from "./schemas/fraud-log.schema"
import { FraudRule } from "./schemas/fraud-rule.schema"
import type { AnalyzeTransactionDto } from "./dto/analyze-transaction.dto"
import type { CreateFraudRuleDto } from "./dto/create-fraud-rule.dto"
import type { UpdateFraudRuleDto } from "./dto/update-fraud-rule.dto"
import type { NotificationService } from "../notification/notification.service"

@Injectable()
export class FraudService {
  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
    @InjectModel(FraudLog.name) private fraudLogModel: Model<FraudLog>,
    @InjectModel(FraudRule.name) private fraudRuleModel: Model<FraudRule>,
    private readonly notificationService: NotificationService,
  ) {}

  async analyzeTransaction(analyzeTransactionDto: AnalyzeTransactionDto) {
    // Generate a transaction ID
    const transactionId = uuidv4()

    // Save the transaction
    const transaction = new this.transactionModel({
      transactionId,
      ...analyzeTransactionDto,
      timestamp: new Date(),
    })
    await transaction.save()

    // Get all enabled fraud rules
    const rules = await this.fraudRuleModel.find({ enabled: true }).exec()

    // Apply fraud detection rules
    const flags: string[] = []
    let riskScore = 0

    for (const rule of rules) {
      const isViolated = await this.evaluateRule(rule, analyzeTransactionDto)
      if (isViolated) {
        flags.push(rule.name)
        riskScore += rule.weight
      }
    }

    // Cap risk score at 1.0
    riskScore = Math.min(riskScore, 1.0)

    // Determine action based on risk score
    let action: "approve" | "flag" | "block"
    if (riskScore > 0.8) {
      action = "block"
    } else if (riskScore > 0.5) {
      action = "flag"
    } else {
      action = "approve"
    }

    // Create fraud log
    const fraudLog = new this.fraudLogModel({
      transactionId,
      userId: analyzeTransactionDto.userId,
      riskScore,
      action,
      flags,
      timestamp: new Date(),
    })
    await fraudLog.save()

    // Send notifications if needed
    if (action !== "approve") {
      // await this.notificationService.sendFraudNotifications({
      //   userId: analyzeTransactionDto.userId,
      //   transactionId,
      //   action,
      //   reason: flags.join(", "),
      // })
    }

    return {
      transactionId,
      riskScore,
      action,
      flags,
    }
  }

  private async evaluateRule(rule: FraudRule, transaction: AnalyzeTransactionDto): Promise<boolean> {
    switch (rule.id) {
      case "multiple-purchases":
        return this.checkMultiplePurchases(transaction.userId)
      case "unusual-location":
        return this.checkUnusualLocation(transaction.ip, transaction.userId)
      case "multiple-accounts":
        return this.checkMultipleAccounts(transaction.cardDetails)
      case "bot-detection":
        return this.checkBotBehavior(transaction.ip, transaction.userAgent)
      case "high-volume":
        return transaction.ticketCount > 8
      default:
        return false
    }
  }

  private async checkMultiplePurchases(userId: string): Promise<boolean> {
    // Check for multiple purchases within the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    const count = await this.transactionModel.countDocuments({
      userId,
      timestamp: { $gte: tenMinutesAgo },
    })
    return count >= 5
  }

  private async checkUnusualLocation(ip: string, userId: string): Promise<boolean> {
    // In a real implementation, this would compare the IP geolocation
    // with the user's typical purchase locations
    // For demo purposes, we'll use a random check
    return Math.random() > 0.8
  }

  private async checkMultipleAccounts(cardDetails: { last4: string; bin: string }): Promise<boolean> {
    // Check if the same card is used across multiple user accounts
    const transactions = await this.transactionModel
      .find({
        "cardDetails.last4": cardDetails.last4,
        "cardDetails.bin": cardDetails.bin,
      })
      .distinct("userId")
    return transactions.length >= 3
  }

  private async checkBotBehavior(ip: string, userAgent: string): Promise<boolean> {
    // In a real implementation, this would analyze request patterns
    // and user agent characteristics to detect bots
    // For demo purposes, we'll use a random check
    return Math.random() > 0.95
  }

  async getFraudLogs(options: {
    userId?: string
    status?: string
    startDate?: string
    endDate?: string
    page: number
    limit: number
  }) {
    const { userId, status, startDate, endDate, page, limit } = options

    const query: any = {}

    if (userId) {
      query.userId = userId
    }

    if (status) {
      query.action = status
    }

    if (startDate || endDate) {
      query.timestamp = {}
      if (startDate) {
        query.timestamp.$gte = new Date(startDate)
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate)
      }
    }

    const total = await this.fraudLogModel.countDocuments(query)
    const logs = await this.fraudLogModel
      .find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec()

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    }
  }

  async getFraudRules() {
    return this.fraudRuleModel.find().exec()
  }

  async createFraudRule(createFraudRuleDto: CreateFraudRuleDto) {
    const ruleId = createFraudRuleDto.id || uuidv4()
    const rule = new this.fraudRuleModel({
      id: ruleId,
      ...createFraudRuleDto,
    })
    return rule.save()
  }

  async updateFraudRule(id: string, updateFraudRuleDto: UpdateFraudRuleDto) {
    return this.fraudRuleModel.findOneAndUpdate({ id }, updateFraudRuleDto, { new: true }).exec()
  }

  async deleteFraudRule(id: string) {
    return this.fraudRuleModel.findOneAndDelete({ id }).exec()
  }

  async getFraudStats(startDate?: string, endDate?: string) {
    const query: any = {}

    if (startDate || endDate) {
      query.timestamp = {}
      if (startDate) {
        query.timestamp.$gte = new Date(startDate)
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate)
      }
    }

    const [approved, flagged, blocked, total] = await Promise.all([
      this.fraudLogModel.countDocuments({ ...query, action: "approve" }),
      this.fraudLogModel.countDocuments({ ...query, action: "flag" }),
      this.fraudLogModel.countDocuments({ ...query, action: "block" }),
      this.fraudLogModel.countDocuments(query),
    ])

    // Get top fraud flags
    const topFlags = await this.fraudLogModel.aggregate([
      { $match: query },
      { $unwind: "$flags" },
      { $group: { _id: "$flags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])

    return {
      counts: {
        approved,
        flagged,
        blocked,
        total,
      },
      percentages: {
        approved: total ? (approved / total) * 100 : 0,
        flagged: total ? (flagged / total) * 100 : 0,
        blocked: total ? (blocked / total) * 100 : 0,
      },
      topFlags: topFlags.map((flag) => ({
        name: flag._id,
        count: flag.count,
      })),
    }
  }
}

